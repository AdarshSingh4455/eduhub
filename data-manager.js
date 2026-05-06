// ===== EDUHUB DATA MANAGER =====
// Handles data persistence using Supabase when configured, with localStorage fallback.

const STORAGE_KEY = 'eduHubData';
const DEFAULT_BUCKET = 'books';
const CLASS_OPTIONS = ['nursery','lkg','ukg','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','everyone'];
const COURSE_OPTIONS = ['everyone','btech','bca','mca','mtech','bba','mba'];

const DataManager = {
    supabase: null,
    bucket: DEFAULT_BUCKET,

    init() {
        this.bucket = window.SUPABASE_BUCKET || DEFAULT_BUCKET;
        this.supabase = window.eduhubSupabase || null;

        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                books: [],
                videos: [],
                subjects: [
                    { id: 'web-dev', name: 'Web Development' },
                    { id: 'python', name: 'Python Programming' },
                    { id: 'data-science', name: 'Data Science' },
                    { id: 'machine-learning', name: 'Machine Learning' }
                ],
                skills: [
                    { id: 'web-dev', name: 'Web Development' },
                    { id: 'javascript', name: 'JavaScript' },
                    { id: 'graphic-design', name: 'Graphic Design' }
                ],
                studySessions: []
            }));
        }
    },

    isSupabaseEnabled() {
        return Boolean(this.supabase && window.eduhubSupabaseEnabled);
    },

    getCurrentUser() {
        if (window.currentUser?.id) return window.currentUser;
        if (typeof currentUser !== 'undefined' && currentUser?.id) return currentUser;
        return null;
    },

    requireAuthenticatedUser() {
        const user = this.getCurrentUser();
        if (!user?.id) {
            throw new Error('Please sign in before making changes');
        }
        return user;
    },

    normalizeName(name) {
        return String(name || '').trim().replace(/\s+/g, ' ');
    },

    normalizeFileName(name) {
        return String(name || 'book.pdf')
            .replace(/[^\w.\-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    },

    normalizeLocalSubjectId(name) {
        return this.normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    },

    createClientId() {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    },

    needsLegacyIdRetry(error) {
        const message = String(error?.message || '').toLowerCase();
        return error?.code === '23502' &&
            message.includes('null value in column "id"');
    },

    isMissingUserIdColumn(error) {
        const message = String(error?.message || '').toLowerCase();
        return (error?.code === 'PGRST204' || error?.code === '42703') &&
            message.includes('user_id');
    },

    withoutUserId(payload) {
        const { user_id, ...legacyPayload } = payload;
        return legacyPayload;
    },

    async insertRowPayload(table, payload) {
        return await this.supabase
            .from(table)
            .insert(payload)
            .select()
            .single();
    },

    async insertRow(table, payload) {
        const { data, error } = await this.insertRowPayload(table, payload);

        if (!error) return data;

        if (this.isMissingUserIdColumn(error)) {
            console.warn(`${table} table is missing user_id. Retrying against legacy schema. Apply supabase-production-fix.sql for RLS-safe writes.`);
            return await this.insertRow(table, this.withoutUserId(payload));
        }

        if (!this.needsLegacyIdRetry(error)) {
            throw error;
        }

        console.warn(`${table} table is missing an id default. Retrying with a client UUID. Apply supabase-production-fix.sql to remove this fallback.`);
        const { data: retryData, error: retryError } = await this.insertRowPayload(table, { id: this.createClientId(), ...payload });

        if (this.isMissingUserIdColumn(retryError)) {
            console.warn(`${table} table is missing user_id. Retrying against legacy schema. Apply supabase-production-fix.sql for RLS-safe writes.`);
            return await this.insertRow(table, this.withoutUserId(payload));
        }
        if (retryError) throw retryError;
        return retryData;
    },

    async uploadBookFile(file, subjectId) {
        if (!this.isSupabaseEnabled()) {
            throw new Error('Supabase storage is not configured');
        }
        if (!file) {
            throw new Error('PDF file is required');
        }

        const user = this.requireAuthenticatedUser();
        const safeName = this.normalizeFileName(file.name);
        const path = `${user.id}/${subjectId}/${Date.now()}_${safeName}`;
        const { error } = await this.supabase.storage.from(this.bucket).upload(path, file, {
            contentType: file.type || 'application/pdf',
            upsert: false
        });

        if (error) {
            throw error;
        }

        return path;
    },

    async deleteBookFile(path) {
        if (!this.isSupabaseEnabled() || !path) return;

        await this.supabase.storage.from(this.bucket).remove([path]);
    },

    async getPublicUrl(path) {
        if (!this.isSupabaseEnabled() || !path) return path || '';
        const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
        return data?.publicUrl || path;
    },

    getAll() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    },

    saveAll(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    // ===== BOOKS MANAGEMENT =====
    async addBook(subjectId, title, fileUrl, classLevel = '', courseLevel = '', file = null) {
        title = this.normalizeName(title);
        if (!title) {
            throw new Error('Title is required');
        }

        if (!classLevel && !courseLevel) {
            throw new Error('Please select at least one Class or Course');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            let file_path = null;
            let publicUrl = String(fileUrl || '').trim();

            if (file) {
                file_path = await this.uploadBookFile(file, subjectId);
                publicUrl = await this.getPublicUrl(file_path);
            }

            if (!publicUrl) {
                throw new Error('File URL is required');
            }

            const payload = {
                subject_id: subjectId,
                title,
                file_url: publicUrl,
                file_path,
                class: classLevel || '',
                course: courseLevel || '',
                user_id: user.id,
                created_at: new Date().toISOString()
            };

            return await this.insertRow('books', payload);
        }

        if (!fileUrl) {
            throw new Error('File URL is required');
        }

        const data = this.getAll();
        const book = {
            id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            subjectId,
            title,
            file_url: fileUrl,
            file_path: '',
            class: classLevel,
            course: courseLevel,
            created_at: new Date().toISOString()
        };

        data.books.push(book);
        this.saveAll(data);
        return book;
    },

    async getBooksBySubject(subjectId, filterType = null, filterValue = null) {
        if (this.isSupabaseEnabled()) {
            let query = this.supabase.from('books').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });

            if (filterType && filterValue) {
                const filterKey = filterType === 'class' ? 'class' : 'course';
                if (filterValue === 'everyone') {
                    query = query.eq(filterKey, 'everyone');
                } else {
                    query = query.or(`${filterKey}.eq.${filterValue},${filterKey}.eq.everyone`);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }

        const data = this.getAll();
        let books = data.books.filter(b => b.subjectId === subjectId);

        if (filterType && filterValue) {
            const filterKey = filterType === 'class' ? 'class' : 'course';
            books = books.filter(b => b[filterKey] === filterValue || b[filterKey] === 'everyone' || filterValue === 'everyone');

            if (filterValue !== 'everyone') {
                const everyoneBooks = data.books.filter(b =>
                    b.subjectId === subjectId &&
                    ((filterType === 'class' && b.class === 'everyone') ||
                     (filterType === 'course' && b.course === 'everyone'))
                );
                books = Array.from(new Set([...books, ...everyoneBooks]));
            }
        }

        return books;
    },

    async getBookById(bookId) {
        if (this.isSupabaseEnabled()) {
            const { data, error } = await this.supabase.from('books').select('*').eq('id', bookId).single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        return data.books.find(b => b.id === bookId);
    },

    async updateBook(bookId, updates = {}, file = null) {
        if (this.isSupabaseEnabled()) {
            const { data: existing, error: fetchError } = await this.supabase.from('books').select('*').eq('id', bookId).single();
            if (fetchError) throw fetchError;

            let file_path = existing.file_path;
            let file_url = existing.file_url;

            if (file) {
                if (file_path) {
                    await this.deleteBookFile(file_path);
                }
                file_path = await this.uploadBookFile(file, existing.subject_id);
                file_url = await this.getPublicUrl(file_path);
            }

            const payload = {
                title: updates.title || existing.title,
                file_url: file_url,
                file_path,
                class: updates.class !== undefined ? updates.class : existing.class,
                course: updates.course !== undefined ? updates.course : existing.course
            };

            const { data, error } = await this.supabase.from('books').update(payload).eq('id', bookId).select().single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        const book = data.books.find(b => b.id === bookId);
        if (!book) throw new Error('Book not found');

        if (updates.title) book.title = updates.title;
        if (updates.file_url) book.file_url = updates.file_url;
        if (updates.class !== undefined) book.class = updates.class;
        if (updates.course !== undefined) book.course = updates.course;

        this.saveAll(data);
        return book;
    },

    async deleteBook(bookId) {
        if (this.isSupabaseEnabled()) {
            const { data: existing, error: fetchError } = await this.supabase.from('books').select('*').eq('id', bookId).single();
            if (fetchError) {
                throw fetchError;
            }
            if (existing?.file_path) {
                await this.deleteBookFile(existing.file_path);
            }
            const { error } = await this.supabase.from('books').delete().eq('id', bookId);
            if (error) throw error;
            return;
        }

        const data = this.getAll();
        data.books = data.books.filter(b => b.id !== bookId);
        this.saveAll(data);
    },

    // ===== VIDEOS MANAGEMENT =====
    async addVideo(subjectId, title, videoUrl, classLevel = '', courseLevel = '') {
        if (!title || !videoUrl) {
            throw new Error('Title and video URL are required');
        }
        if (!classLevel && !courseLevel) {
            throw new Error('Please select at least one Class or Course');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            const payload = {
                subject_id: subjectId,
                title,
                video_url: videoUrl,
                class: classLevel || '',
                course: courseLevel || '',
                user_id: user.id,
                created_at: new Date().toISOString()
            };
            return await this.insertRow('videos', payload);
        }

        const data = this.getAll();
        const video = {
            id: 'video_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            subjectId,
            title,
            video_url: videoUrl,
            class: classLevel,
            course: courseLevel,
            created_at: new Date().toISOString()
        };

        data.videos.push(video);
        this.saveAll(data);
        return video;
    },

    async getVideosBySubject(subjectId, filterType = null, filterValue = null) {
        if (this.isSupabaseEnabled()) {
            let query = this.supabase.from('videos').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });

            if (filterType && filterValue) {
                const filterKey = filterType === 'class' ? 'class' : 'course';
                if (filterValue === 'everyone') {
                    query = query.eq(filterKey, 'everyone');
                } else {
                    query = query.or(`${filterKey}.eq.${filterValue},${filterKey}.eq.everyone`);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }

        const data = this.getAll();
        let videos = data.videos.filter(v => v.subjectId === subjectId);

        if (filterType && filterValue) {
            const filterKey = filterType === 'class' ? 'class' : 'course';
            videos = videos.filter(v => v[filterKey] === filterValue || v[filterKey] === 'everyone' || filterValue === 'everyone');

            if (filterValue !== 'everyone') {
                const everyoneVideos = data.videos.filter(v =>
                    v.subjectId === subjectId &&
                    ((filterType === 'class' && v.class === 'everyone') ||
                     (filterType === 'course' && v.course === 'everyone'))
                );
                videos = Array.from(new Set([...videos, ...everyoneVideos]));
            }
        }

        return videos;
    },

    async getVideoById(videoId) {
        if (this.isSupabaseEnabled()) {
            const { data, error } = await this.supabase.from('videos').select('*').eq('id', videoId).single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        return data.videos.find(v => v.id === videoId);
    },

    async updateVideo(videoId, updates = {}) {
        if (this.isSupabaseEnabled()) {
            const { data, error } = await this.supabase.from('videos').update({
                title: updates.title,
                video_url: updates.video_url,
                class: updates.class,
                course: updates.course
            }).eq('id', videoId).select().single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        const video = data.videos.find(v => v.id === videoId);
        if (!video) throw new Error('Video not found');

        if (updates.title) video.title = updates.title;
        if (updates.video_url) video.video_url = updates.video_url;
        if (updates.class !== undefined) video.class = updates.class;
        if (updates.course !== undefined) video.course = updates.course;

        this.saveAll(data);
        return video;
    },

    async deleteVideo(videoId) {
        if (this.isSupabaseEnabled()) {
            const { error } = await this.supabase.from('videos').delete().eq('id', videoId);
            if (error) throw error;
            return;
        }

        const data = this.getAll();
        data.videos = data.videos.filter(v => v.id !== videoId);
        this.saveAll(data);
    },

    // ===== SUBJECTS MANAGEMENT =====
    async getAllSubjects() {
        if (this.isSupabaseEnabled()) {
            try {
                const { data, error } = await this.supabase.from('subjects').select('*').order('name');
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.warn('Supabase subjects error, falling back to localStorage:', error);
                // Fall back to localStorage
            }
        }

        const data = this.getAll();
        return data.subjects || [];
    },

    async addSubject(name) {
        name = this.normalizeName(name);
        if (!name) {
            throw new Error('Subject name is required');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            const { data: existing, error: duplicateError } = await this.supabase
                .from('subjects')
                .select('id,name')
                .ilike('name', name)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (existing?.length) {
                throw new Error('Subject already exists');
            }

            return await this.insertRow('subjects', {
                name,
                user_id: user.id
            });
        }

        const data = this.getAll();
        const subject = {
            id: this.normalizeLocalSubjectId(name),
            name
        };

        if (data.subjects.some(s => s.name.toLowerCase() === name.toLowerCase() || s.id === subject.id)) {
            throw new Error('Subject already exists');
        }

        data.subjects.push(subject);
        this.saveAll(data);
        return subject;
    },

    async updateSubject(subjectId, name) {
        name = this.normalizeName(name);
        if (!name) {
            throw new Error('Subject name is required');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            const { data: existing, error: duplicateError } = await this.supabase
                .from('subjects')
                .select('id,name')
                .ilike('name', name)
                .neq('id', subjectId)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (existing?.length) {
                throw new Error('Subject already exists');
            }

            const { data, error } = await this.supabase
                .from('subjects')
                .update({ name, user_id: user.id })
                .eq('id', subjectId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        const subject = data.subjects.find(s => s.id === subjectId);
        if (!subject) throw new Error('Subject not found');
        subject.name = name;
        this.saveAll(data);
        return subject;
    },

    async deleteSubject(subjectId) {
        if (this.isSupabaseEnabled()) {
            await this.supabase.from('books').delete().eq('subject_id', subjectId);
            await this.supabase.from('videos').delete().eq('subject_id', subjectId);
            const { error } = await this.supabase.from('subjects').delete().eq('id', subjectId);
            if (error) throw error;
            return;
        }

        const data = this.getAll();
        data.books = data.books.filter(b => b.subjectId !== subjectId);
        data.videos = data.videos.filter(v => v.subjectId !== subjectId);
        data.subjects = data.subjects.filter(s => s.id !== subjectId);
        this.saveAll(data);
    },

    // ===== SKILLS MANAGEMENT =====
    async getAllSkills() {
        if (this.isSupabaseEnabled()) {
            try {
                const { data, error } = await this.supabase.from('skills').select('*').order('name');
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.warn('Supabase skills error, falling back to localStorage:', error);
                // Fall back to localStorage
            }
        }

        const data = this.getAll();
        return data.skills || [];
    },

    async addSkill(name) {
        name = this.normalizeName(name);
        if (!name) {
            throw new Error('Skill name is required');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            const { data: existing, error: duplicateError } = await this.supabase
                .from('skills')
                .select('id,name')
                .ilike('name', name)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (existing?.length) {
                throw new Error('Skill already exists');
            }

            return await this.insertRow('skills', {
                name,
                user_id: user.id
            });
        }

        const data = this.getAll();
        const skill = { id: this.normalizeLocalSubjectId(name), name };
        if (data.skills.some(s => s.name.toLowerCase() === name.toLowerCase() || s.id === skill.id)) {
            throw new Error('Skill already exists');
        }

        data.skills.push(skill);
        this.saveAll(data);
        return skill;
    },

    async updateSkill(skillId, name) {
        name = this.normalizeName(name);
        if (!name) {
            throw new Error('Skill name is required');
        }

        if (this.isSupabaseEnabled()) {
            const user = this.requireAuthenticatedUser();
            const { data: existing, error: duplicateError } = await this.supabase
                .from('skills')
                .select('id,name')
                .ilike('name', name)
                .neq('id', skillId)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (existing?.length) {
                throw new Error('Skill already exists');
            }

            const { data, error } = await this.supabase
                .from('skills')
                .update({ name, user_id: user.id })
                .eq('id', skillId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const data = this.getAll();
        const skill = data.skills.find(s => s.id === skillId);
        if (!skill) throw new Error('Skill not found');
        skill.name = name;
        this.saveAll(data);
        return skill;
    },

    async deleteSkill(skillId) {
        if (this.isSupabaseEnabled()) {
            const { error } = await this.supabase.from('skills').delete().eq('id', skillId);
            if (error) throw error;
            return;
        }

        const data = this.getAll();
        data.skills = data.skills.filter(s => s.id !== skillId);
        this.saveAll(data);
    },

    // ===== STUDY SESSIONS MANAGEMENT =====
    addStudySession(date, startTime, endTime, duration) {
        const data = this.getAll();
        const session = {
            id: 'session_' + Date.now(),
            date,
            start_time: startTime,
            end_time: endTime,
            duration
        };

        data.studySessions.push(session);
        this.saveAll(data);
        return session;
    },

    getStudySessionsByDate(date) {
        const data = this.getAll();
        return data.studySessions.filter(s => s.date === date);
    },

    getRecentStudySessions(days = 3) {
        const data = this.getAll();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return data.studySessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= cutoffDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    cleanupOldSessions(daysToKeep = 7) {
        const data = this.getAll();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        data.studySessions = data.studySessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= cutoffDate;
        });

        this.saveAll(data);
    }
};
