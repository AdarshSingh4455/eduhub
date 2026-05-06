// EduHub SPA frontend logic with Supabase auth, profile, chat, books, and admin support.
// Merged from app.js and script.js - all functionality in one file.

let currentUser = null;
let currentRole = null;
let currentSubject = 'web-dev';
let currentChatbot = 'saarthi';
let saarthiChatHistory = [];
let mindcareChatHistory = [];
let bookSearchTerm = '';
let studentResourceFilters = {
    class: '',
    course: ''
};

const AUTH_STORAGE_KEY = 'eduUser';
const CHAT_STORAGE_KEY = 'eduChatHistory';
let authInitialized = false;
let authSubscription = null;
let processingSessionUserId = null;
let lastProcessedSessionKey = null;

// Tracking data storage
let trackingData = {
    downloads: {},
    videoClicks: {},
    goals: [],
    progress: {
        'web-dev': 45,
        'python': 65,
        'data-science': 30,
        'machine-learning': 50
    }
};

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', async () => {
    if (redirectFileLaunchToServer()) return;

    DataManager.init();
    setupThemeToggle();
    setupSidebarNavigation();
    setupDragDrop();
    handleOAuthErrorParams();
    await initializeAuth();
    // loadSubjectsList() and loadSkillsList() are now called after auth in initializeAuth
    loadSavedChatHistory();
    switchChatbot(currentChatbot);
    const initialSection = window.location.hash?.slice(1);
    showSection(document.getElementById(initialSection) ? initialSection : 'dashboard');
});

// ===== AUTHENTICATION =====
function getAppOrigin() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }

    return window.location.origin;
}

function getOAuthRedirectUrl() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }

    const { origin, pathname } = window.location;

    if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') {
        return origin;
    }

    if (pathname.endsWith('/frontend/index.html') || pathname.endsWith('/index.html')) {
        return `${origin}${pathname}`;
    }

    if (pathname.endsWith('/frontend/') || pathname.endsWith('/frontend')) {
        return `${origin}/frontend/index.html`;
    }

    return `${origin}/frontend/index.html`;
}

function redirectFileLaunchToServer() {
    if (window.location.protocol !== 'file:') return false;

    const serverUrl = 'http://localhost:3000';
    console.warn(`EduHub must be served over HTTP for Google OAuth. Redirecting to ${serverUrl}`);
    window.location.replace(serverUrl);
    return true;
}

async function initializeAuth() {
    if (authInitialized) return;
    authInitialized = true;

    if (!window.eduhubSupabaseEnabled) {
        console.error('Supabase not configured');
        showAuthModal();
        return;
    }

    try {
        const { data, error } = await window.eduhubSupabase.auth.getSession();
        if (error) {
            console.error('Supabase getSession error:', error);
        }

        if (data?.session) {
            window.currentUser = data.session.user;
            sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(data.session));
            await processSupabaseSession(data.session, { showLoginToast: false });
            hideAuthModal();
        } else {
            currentUser = null;
            currentRole = null;
            window.currentUser = null;
            sessionStorage.removeItem('eduhubSupabaseSession');
            syncAuthUI();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        currentUser = null;
        currentRole = null;
        window.currentUser = null;
        syncAuthUI();
    }

    await subscribeSupabaseEvents();
}

function hideAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = "none";
}

function showAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = "flex";
}

function syncAuthUI() {
    if (currentUser?.id || window.currentUser?.id) {
        hideAuthModal();
        updateUIForRole();
        if (currentUser?.id) updateUserInfo();
        return;
    }

    showAuthModal();
    updateUIForRole();
}

async function getSupabaseSession() {
    if (!window.eduhubSupabaseEnabled) return null;
    try {
        const { data, error } = await window.eduhubSupabase.auth.getSession();
        if (error) {
            console.error('Supabase getSession error:', error);
            return null;
        }
        const session = data?.session;
        if (session) {
            window.currentUser = session.user;
            sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(session));
        } else {
            window.currentUser = null;
        }
        return session;
    } catch (error) {
        console.error('Supabase session error:', error);
        return null;
    }
}

async function handleSupabaseRedirect() {
    if (!window.eduhubSupabaseEnabled) return;
    try {
        const { data, error } = await window.eduhubSupabase.auth.getSession();
        if (error) {
            console.error('Supabase getSession error:', error);
            return;
        }
        if (data?.session) {
            window.currentUser = data.session.user;
            sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(data.session));
            await processSupabaseSession(data.session);
            hideAuthModal();
        } else {
            syncAuthUI();
        }
    } catch (error) {
        console.error('Error handling Supabase redirect:', error);
        syncAuthUI();
    }
}

async function subscribeSupabaseEvents() {
    if (!window.eduhubSupabaseEnabled) return;
    if (authSubscription) return authSubscription;

    try {
        const { data: { subscription } } = window.eduhubSupabase.auth.onAuthStateChange(async (event, session) => {

            console.log('Supabase auth event:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session) {
                window.currentUser = session.user;
                sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(session));
                await processSupabaseSession(session);
                hideAuthModal();
                syncAuthUI();
            }

            if (event === 'INITIAL_SESSION' && session) {
                window.currentUser = session.user;
                sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(session));
                if (!currentUser?.id) {
                    await processSupabaseSession(session, { showLoginToast: false });
                }
                hideAuthModal();
                syncAuthUI();
            }

            if (event === 'TOKEN_REFRESHED' && session) {
                window.currentUser = session.user;
                sessionStorage.setItem('eduhubSupabaseSession', JSON.stringify(session));
                syncAuthUI();
            }

            if (event === 'SIGNED_OUT') {
                sessionStorage.removeItem('eduhubSupabaseSession');
                sessionStorage.removeItem('loginShown');

                currentUser = null;
                currentRole = null;
                window.currentUser = null;
                lastProcessedSessionKey = null;
                syncAuthUI();
            }
        });

        authSubscription = subscription;
        return subscription;

    } catch (error) {
        console.error('Supabase event subscription failed:', error);
    }
}

async function processSupabaseSession(session, options = {}) {
    if (!session?.user) return;
    const sessionKey = session.access_token || `${session.user.id}:${session.expires_at || ''}`;
    if (lastProcessedSessionKey === sessionKey) return;
    if (processingSessionUserId === session.user.id) return;
    processingSessionUserId = session.user.id;
    const { showLoginToast = true } = options;
    try {
        const user = session.user;
        const profile = await fetchSupabaseProfile(user.id);
        currentUser = {
            id: user.id,
            email: user.email || '',
            name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student',
            role: profile?.role || 'student',
            profilePicture: profile?.profile_picture || user.user_metadata?.avatar_url || '',
            supabaseUser: true
        };
        window.currentUser = currentUser;
        currentRole = currentUser.role;
        await saveSupabaseProfile(currentUser);
        hideAuthModal();
        updateUIForRole();
        updateUserInfo();
        await loadSubjectsList();
        await loadSkillsList();
        if (showLoginToast && !sessionStorage.getItem('loginShown')) {
            showToast(`Welcome, ${currentUser.name}!`, 'success');
            sessionStorage.setItem("loginShown", true);
        }
        lastProcessedSessionKey = sessionKey;
        syncAuthUI();
    } finally {
        processingSessionUserId = null;
    }
}

async function fetchSupabaseProfile(userId) {
    if (!window.eduhubSupabaseEnabled) return null;
    try {
        const { data, error } = await window.eduhubSupabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

async function saveSupabaseProfile(user) {
    const fullPayload = {
        id: user.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profilePicture,
        updated_at: new Date().toISOString()
    };

    const { error } = await window.eduhubSupabase
        .from('profiles')
        .upsert(fullPayload, { onConflict: 'id' });

    if (!error) return;

    const shouldRetryLegacyProfile = error.code === 'PGRST204' ||
        error.code === '42703' ||
        String(error.message || '').includes('user_id') ||
        String(error.message || '').includes('updated_at');

    if (shouldRetryLegacyProfile) {
        const legacyPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_picture: user.profilePicture
        };
        const { error: legacyError } = await window.eduhubSupabase
            .from('profiles')
            .upsert(legacyPayload, { onConflict: 'id' });

        if (!legacyError) return;
        console.error('Profile save error:', legacyError);
        return;
    }

    console.error('Profile save error:', error);
}

function handleOAuthErrorParams() {
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get('error_description');
    if (!errorDescription) return;

    console.warn('Supabase OAuth redirect error:', errorDescription);
    showToast(errorDescription.replace(/\+/g, ' '), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
}

async function signInWithGoogle() {
    if (!window.eduhubSupabaseEnabled) {
        showToast('Supabase not configured', 'error');
        return;
    }

    const redirectTo = getOAuthRedirectUrl();

    try {
        const { error } = await window.eduhubSupabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo
            }
        });

        if (error) {
            console.error('Google sign-in error:', error);
            showToast('Failed to sign in with Google', 'error');
        }
        // Redirect will happen automatically
    } catch (error) {
        console.error('Google sign-in error:', error);
        showToast('Failed to sign in with Google', 'error');
    }
}

function selectRole(role) {
    currentRole = role;
    const studentBtn = document.getElementById('studentBtn');
    const adminBtn = document.getElementById('adminBtn');

    if (studentBtn && adminBtn) {
        studentBtn.classList.toggle('active', role === 'student');
        adminBtn.classList.toggle('active', role === 'admin');
    }

    const studentLogin = document.getElementById('studentLogin');
    const adminLogin = document.getElementById('adminLogin');

    if (studentLogin && adminLogin) {
        studentLogin.classList.toggle('active', role === 'student');
        adminLogin.classList.toggle('active', role === 'admin');
    }
}

async function logout() {
    try {
        if (window.eduhubSupabaseEnabled) {
            await window.eduhubSupabase.auth.signOut();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    currentUser = null;
    currentRole = null;
    window.currentUser = null;
    lastProcessedSessionKey = null;
    sessionStorage.removeItem('eduhubSupabaseSession');
    sessionStorage.removeItem('loginShown');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    syncAuthUI();
    showToast('Logged out successfully', 'info');
}

function closeAuthModal() {
    hideAuthModal();
}

function updateUIForRole() {
    const isAdmin = currentRole === 'admin';

    // Show/hide admin tools
    document.querySelectorAll('[id$="Tools"]').forEach(el => {
        el.classList.toggle('hidden', !isAdmin);
    });

    // Show action buttons for admins
    document.querySelectorAll('.resource-actions').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });

    if (!currentUser) {
        document.querySelectorAll('[id$="UserInfo"]').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.classList.add('hidden');
            logoutBtn.style.display = 'none';
        }

        const profileName = document.getElementById('profileName');
        const profileRole = document.getElementById('profileRole');
        const profileImg = document.getElementById('profileImg');
        if (profileName) profileName.textContent = 'Guest';
        if (profileRole) profileRole.textContent = 'STUDENT';
        if (profileImg) profileImg.src = 'https://img.icons8.com/color/96/000000/user-male-circle--v1.png';
    }
}

function updateUserInfo() {
    if (!currentUser) return;

    const userInfo = `${currentUser.name} (${currentRole.toUpperCase()})`;

    const infoElements = document.querySelectorAll('[id$="UserInfo"]');
    infoElements.forEach(el => {
        el.textContent = userInfo;
        el.style.display = 'inline-flex';
    });

    // Update profile section in sidebar
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const profileImg = document.getElementById('profileImg');

    if (profileName) profileName.textContent = currentUser.name || 'Guest';
    if (profileRole) profileRole.textContent = currentRole ? currentRole.toUpperCase() : 'STUDENT';

    // Update profile picture
    if (profileImg && currentUser.profilePicture) {
        profileImg.src = currentUser.profilePicture;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.style.display = 'inline-block';
    }
}

// ===== NAVIGATION & UI =====
function showSection(sectionId) {
    document.querySelectorAll('main .section').forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    if (sectionId === 'profile') {
        loadProfileData();
    }
}

function navigate(section) {
    closeSidebar();
    showSection(section);
}

function setupSidebarNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const section = item.getAttribute('data-section');
            if (section) {
                navigate(section);
            }
        });
    });
}

function toggleSidebarFromBook() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            navigate('studies');
        }
    }
}

function openProfilePage() {
    closeSidebar();
    showSection('profile');
    loadProfileData();
    
    // Scroll profile section into view
    setTimeout(() => {
        const profileSection = document.getElementById('profile');
        if (profileSection) {
            profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

function toggleContent(contentId) {
    const content = document.getElementById(contentId);
    if (content) {
        content.classList.toggle('hidden');
    }
}

// ===== SUBJECTS & SKILLS MANAGEMENT =====
async function loadSubjectsList() {
    try {
        const subjects = await DataManager.getAllSubjects();
        const resourceList = document.querySelector('#studyResources .resource-list');

        if (!resourceList) return;

        resourceList.innerHTML = subjects.map(subject => `
            <li class="resource-item">
                <a href="#" onclick="openSubjectDetail('${subject.id}'); return false;">${subject.name}</a>
                <div class="resource-actions" ${currentRole === 'admin' ? '' : 'style="display: none;"'}>
                    <button class="action-btn" onclick="editSubject('${subject.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="deleteSubject('${subject.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('Failed to load subjects from server, using local data', 'warning');
        // DataManager will fall back to localStorage automatically
    }
}

async function loadSkillsList() {
    const skills = await DataManager.getAllSkills();
    const resourceList = document.querySelector('#skillCourses .resource-list');

    if (!resourceList) return;

    resourceList.innerHTML = skills.map(skill => `
        <li class="resource-item">
            <a href="#" onclick="openSkillDetail('${skill.id}'); return false;">${skill.name}</a>
            <div class="resource-actions" ${currentRole === 'admin' ? '' : 'style="display: none;"'}>
                <button class="action-btn" onclick="editSkill('${skill.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="deleteSkill('${skill.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </li>
    `).join('');
}

function openSubjectDetail(subjectId) {
    currentSubject = subjectId;
    document.getElementById('detailTitle').textContent = subjectId.replace('-', ' ').toUpperCase();
    document.getElementById('detailModal').classList.add('active');

    // Load books and videos for subject
    loadSubjectResources(subjectId);
}

function openSkillDetail(skillId) {
    currentSubject = skillId;
    document.getElementById('detailTitle').textContent = skillId.replace('-', ' ').toUpperCase() + ' Skill';
    document.getElementById('detailModal').classList.add('active');

    // Load books and videos for skill
    loadSubjectResources(skillId);
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function switchDetailTab(tab, selectedButton) {
    const tabs = document.querySelectorAll('#detailModal .tab-content');
    const btns = document.querySelectorAll('#detailModal .tab-btn');
    const selectedTab = document.getElementById(`${tab}Tab`);

    tabs.forEach(t => t.classList.add('hidden'));
    btns.forEach(b => b.classList.remove('active'));

    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    const button = selectedButton || document.querySelector(`#detailModal [data-detail-tab="${tab}"]`);
    if (button) {
        button.classList.add('active');
    }
}

async function loadSubjectResources(subjectId) {
    // Load books and videos for subject
    await loadBooks(subjectId, studentResourceFilters);
    await loadVideos(subjectId, studentResourceFilters);
}

async function loadBooks(subjectId, filterType, filterValue) {
    const booksList = document.getElementById('booksList');

    try {
        // Get books from DataManager
        const subjectBooks = await DataManager.getBooksBySubject(subjectId);

        // Apply filters if provided
        let filteredBooks = subjectBooks;
        if (typeof filterType === 'object' && filterType !== null) {
            const filters = filterType;
            filteredBooks = subjectBooks.filter(book => {
                const classMatches = !filters.class || book.class === filters.class || book.class === 'everyone';
                const courseMatches = !filters.course || book.course === filters.course || book.course === 'everyone';
                return classMatches && courseMatches;
            });
        } else if (filterType && filterValue) {
            filteredBooks = subjectBooks.filter(book => {
                if (filterType === 'class') {
                    return book.class === filterValue || book.class === 'everyone';
                } else if (filterType === 'course') {
                    return book.course === filterValue || book.course === 'everyone';
                }
                return true;
            });
        }

        if (filteredBooks.length === 0) {
            booksList.innerHTML = '<div class="empty-state"><i class="fas fa-book-open" style="font-size: 3em; opacity: 0.5; margin-bottom: 10px;"></i><p>No books uploaded yet</p></div>';
            return;
        }

        booksList.innerHTML = filteredBooks.map(book => `
            <div class="resource-item" style="margin-bottom: 10px;">
                <div style="flex: 1;">
                    <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 10px;"></i>
                    <span style="font-weight: 500;">${book.title}</span>
                    ${book.class && book.class !== 'everyone' ? `<span class="badge class-badge">${book.class}</span>` : ''}
                    ${book.course && book.course !== 'everyone' ? `<span class="badge course-badge">${book.course}</span>` : ''}
                </div>
                <div class="resource-actions">
                    <button class="action-btn" onclick="downloadBook('${book.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    ${currentRole === 'admin' ? `
                        <button class="action-btn" onclick="editBook('${book.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteBook('${book.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        booksList.innerHTML = '<p style="color: #ef4444;">Error loading books</p>';
        console.error('Error loading books:', error);
    }
}

async function loadVideos(subjectId, filterType, filterValue) {
    const videosList = document.getElementById('videosList');

    try {
        // Get videos from DataManager
        const subjectVideos = await DataManager.getVideosBySubject(subjectId);

        // Apply filters if provided
        let filteredVideos = subjectVideos;
        if (typeof filterType === 'object' && filterType !== null) {
            const filters = filterType;
            filteredVideos = subjectVideos.filter(video => {
                const classMatches = !filters.class || video.class === filters.class || video.class === 'everyone';
                const courseMatches = !filters.course || video.course === filters.course || video.course === 'everyone';
                return classMatches && courseMatches;
            });
        } else if (filterType && filterValue) {
            filteredVideos = subjectVideos.filter(video => {
                if (filterType === 'class') {
                    return video.class === filterValue || video.class === 'everyone';
                } else if (filterType === 'course') {
                    return video.course === filterValue || video.course === 'everyone';
                }
                return true;
            });
        }

        if (filteredVideos.length === 0) {
            videosList.innerHTML = '<div class="empty-state"><i class="fab fa-youtube" style="font-size: 3em; opacity: 0.5; margin-bottom: 10px;"></i><p>No videos added yet</p></div>';
            return;
        }

        videosList.innerHTML = filteredVideos.map(video => `
            <div class="resource-item" style="margin-bottom: 10px; cursor: pointer;" onclick="openYouTube('${video.video_url}')">
                <div style="flex: 1;">
                    <i class="fab fa-youtube" style="color: #ef4444; margin-right: 10px;"></i>
                    <span style="font-weight: 500;">${video.title}</span>
                    ${video.class && video.class !== 'everyone' ? `<span class="badge class-badge">${video.class}</span>` : ''}
                    ${video.course && video.course !== 'everyone' ? `<span class="badge course-badge">${video.course}</span>` : ''}
                </div>
                <div class="resource-actions">
                    <button class="action-btn" onclick="openYouTube('${video.video_url}')">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    ${currentRole === 'admin' ? `
                        <button class="action-btn" onclick="editVideo('${video.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteVideo('${video.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        videosList.innerHTML = '<p style="color: #ef4444;">Error loading videos</p>';
        console.error('Error loading videos:', error);
    }
}

// ===== EDIT/DELETE FUNCTIONS =====
async function editBook(bookId) {
    try {
        const book = await DataManager.getBookById(bookId);
        if (!book) return;

        // Show edit modal
        const modal = document.getElementById('editBookModal');
        document.getElementById('editBookTitle').value = book.title;
        document.getElementById('editBookClass').value = book.class || 'everyone';
        document.getElementById('editBookCourse').value = book.course || 'everyone';
        document.getElementById('editBookId').value = bookId;

        modal.style.display = 'block';
    } catch (error) {
        showToast('Error loading book details', 'error');
        console.error('Error loading book for edit:', error);
    }
}

async function saveBookEdit() {
    const bookId = document.getElementById('editBookId').value;
    const title = document.getElementById('editBookTitle').value.trim();
    const bookClass = document.getElementById('editBookClass').value;
    const course = document.getElementById('editBookCourse').value;

    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }

    try {
        await DataManager.updateBook(bookId, { title, class: bookClass, course });
        document.getElementById('editBookModal').style.display = 'none';
        await loadBooks(currentSubject);
        showToast('Book updated successfully', 'success');
    } catch (error) {
        showToast('Error updating book', 'error');
        console.error('Error updating book:', error);
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        await DataManager.deleteBook(bookId);
        await loadBooks(currentSubject);
        showToast('Book deleted successfully', 'success');
    } catch (error) {
        showToast('Error deleting book', 'error');
        console.error('Error deleting book:', error);
    }
}

async function editVideo(videoId) {
    try {
        const video = await DataManager.getVideoById(videoId);
        if (!video) return;

        // Show edit modal
        const modal = document.getElementById('editVideoModal');
        document.getElementById('editVideoTitle').value = video.title;
        document.getElementById('editVideoUrl').value = video.video_url;
        document.getElementById('editVideoClass').value = video.class || 'everyone';
        document.getElementById('editVideoCourse').value = video.course || 'everyone';
        document.getElementById('editVideoId').value = videoId;

        modal.style.display = 'block';
    } catch (error) {
        showToast('Error loading video details', 'error');
        console.error('Error loading video for edit:', error);
    }
}

async function saveVideoEdit() {
    const videoId = document.getElementById('editVideoId').value;
    const title = document.getElementById('editVideoTitle').value.trim();
    const videoUrl = document.getElementById('editVideoUrl').value.trim();
    const videoClass = document.getElementById('editVideoClass').value;
    const course = document.getElementById('editVideoCourse').value;

    if (!title || !videoUrl) {
        showToast('Please enter title and URL', 'error');
        return;
    }

    try {
        await DataManager.updateVideo(videoId, { title, video_url: videoUrl, class: videoClass, course });
        document.getElementById('editVideoModal').style.display = 'none';
        await loadVideos(currentSubject);
        showToast('Video updated successfully', 'success');
    } catch (error) {
        showToast('Error updating video', 'error');
        console.error('Error updating video:', error);
    }
}

async function deleteVideo(videoId) {
    if (!confirm('Delete this video?')) return;

    try {
        await DataManager.deleteVideo(videoId);
        await loadVideos(currentSubject);
        showToast('Video deleted successfully', 'success');
    } catch (error) {
        showToast('Error deleting video', 'error');
        console.error('Error deleting video:', error);
    }
}

async function editSubject(subjectId) {
    try {
        const subjects = await DataManager.getAllSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            showToast('Subject not found', 'error');
            return;
        }

        const newName = prompt('Edit subject name:', subject.name);
        if (newName && newName.trim()) {
            try {
                await DataManager.updateSubject(subjectId, newName);
                showToast('Subject updated!', 'success');
                await loadSubjectsList();
            } catch (error) {
                showToast('Error: ' + error.message, 'error');
            }
        }
    } catch (error) {
        showToast('Error loading subject: ' + error.message, 'error');
    }
}

async function deleteSubject(subjectId) {
    if (!confirm('Delete this subject and all associated books/videos?')) return;
    try {
        await DataManager.deleteSubject(subjectId);
        showToast('Subject deleted!', 'success');
        await loadSubjectsList();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function editSkill(skillId) {
    const skills = await DataManager.getAllSkills();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        return;
    }

    const newName = prompt('Edit skill name:', skill.name);
    if (newName && newName.trim()) {
        try {
            await DataManager.updateSkill(skillId, newName);
            showToast('Skill updated!', 'success');
            await loadSkillsList();
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    }
}

async function deleteSkill(skillId) {
    if (!confirm('Delete this skill?')) return;
    try {
        await DataManager.deleteSkill(skillId);
        showToast('Skill deleted!', 'success');
        await loadSkillsList();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ===== ADD NEW SUBJECT/SKILL =====
function showAddSubject() {
    document.getElementById('subjectNameInput').value = '';
    document.getElementById('addSubjectModal').classList.add('active');
}

function closeSubjectModal() {
    document.getElementById('addSubjectModal').classList.remove('active');
}

async function saveNewSubject() {
    const subjectName = document.getElementById('subjectNameInput').value.trim();

    if (!subjectName) {
        showToast('Subject name is required', 'error');
        return;
    }

    try {
        await DataManager.addSubject(subjectName);
        closeSubjectModal();
        await loadSubjectsList();
        showToast('Subject added successfully!', 'success');
    } catch (error) {
        showToast('Error adding subject', 'error');
        console.error('Error adding subject:', error);
    }
}

function showAddSkill() {
    document.getElementById('skillNameInput').value = '';
    document.getElementById('addSkillModal').classList.add('active');
}

function closeSkillModal() {
    document.getElementById('addSkillModal').classList.remove('active');
}

async function saveNewSkill() {
    const skillName = document.getElementById('skillNameInput').value.trim();

    if (!skillName) {
        showToast('Skill name is required', 'error');
        return;
    }

    try {
        await DataManager.addSkill(skillName);
        closeSkillModal();
        await loadSkillsList();
        showToast('Skill added successfully!', 'success');
    } catch (error) {
        showToast('Error adding skill', 'error');
        console.error('Error adding skill:', error);
    }
}

// ===== BOOK UPLOAD =====
function showUploadBook() {
    document.getElementById('uploadBookForm').classList.toggle('hidden');
}

async function uploadBook(button) {
    const title = document.getElementById('bookTitle').value.trim();
    const classLevel = document.getElementById('bookClass').value.trim();
    const courseLevel = document.getElementById('bookCourse').value.trim();
    const file = document.getElementById('bookFile').files[0];
    const editingId = document.getElementById('uploadBookForm').dataset.editingId;

    if (!title) {
        showToast('Please enter a book title', 'error');
        return;
    }

    if (!editingId && !file) {
        showToast('Please select a PDF file', 'error');
        return;
    }

    if (file && file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }

    if (!classLevel && !courseLevel) {
        showToast('Please select at least one Class or Course', 'error');
        return;
    }

    // Show loading state
    const btn = button || document.querySelector('#uploadBookForm .btn');
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loader"></span> Processing...';
    btn.disabled = true;

    try {
        if (editingId) {
            // Update existing book
            await DataManager.updateBook(editingId, {
                title,
                class: classLevel,
                course: courseLevel
            }, file);
            showToast('Book updated successfully!', 'success');
        } else {
            // Add new book with file upload to Supabase Storage
            await DataManager.addBook(currentSubject, title, '', classLevel, courseLevel, file);
            showToast('Book uploaded successfully!', 'success');
        }

        // Clear form
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookFile').value = '';
        document.getElementById('bookClass').value = '';
        document.getElementById('bookCourse').value = '';
        document.getElementById('uploadBookForm').classList.add('hidden');
        document.getElementById('uploadBookForm').dataset.editingId = '';

        // Reset drag-drop zone
        const dropZone = document.getElementById('bookDropZone');
        const fileName = document.getElementById('bookFileName');
        if (dropZone) dropZone.textContent = 'Drag & drop PDF here or click to choose file';
        if (fileName) fileName.textContent = 'No file selected';

        // Reset button
        btn.textContent = editingId ? 'Update Book' : 'Upload';

        // Refresh the list immediately
        await loadBooks(currentSubject);

        btn.disabled = false;
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        const btn = document.querySelector('#uploadBookForm .btn');
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// ===== VIDEO MANAGEMENT =====
function showAddVideo() {
    document.getElementById('addVideoForm').classList.toggle('hidden');
}

async function addVideo() {
    const title = document.getElementById('videoTitle').value.trim();
    const url = document.getElementById('videoUrl').value.trim();
    const classLevel = document.getElementById('videoClass') ? document.getElementById('videoClass').value.trim() : '';
    const courseLevel = document.getElementById('videoCourse') ? document.getElementById('videoCourse').value.trim() : '';
    const editingId = document.getElementById('addVideoForm').dataset.editingId;

    if (!title || !url) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        showToast('Please enter a valid YouTube URL', 'error');
        return;
    }

    if (!classLevel && !courseLevel) {
        showToast('Please select at least one of Class or Course', 'error');
        return;
    }

    try {
        if (editingId) {
            // Update existing video
            await DataManager.updateVideo(editingId, {
                title,
                video_url: url,
                class: classLevel,
                course: courseLevel
            });
            showToast('Video updated successfully!', 'success');
        } else {
            // Add new video
            await DataManager.addVideo(currentSubject, title, url, classLevel, courseLevel);
            showToast('Video added successfully!', 'success');
        }

        document.getElementById('videoTitle').value = '';
        document.getElementById('videoUrl').value = '';
        if (document.getElementById('videoClass')) document.getElementById('videoClass').value = '';
        if (document.getElementById('videoCourse')) document.getElementById('videoCourse').value = '';
        document.getElementById('addVideoForm').classList.add('hidden');
        document.getElementById('addVideoForm').dataset.editingId = '';

        // Reset button
        const btn = document.querySelector('#addVideoForm .btn');
        btn.textContent = 'Add Video';

        // Refresh the list
        loadVideos(currentSubject);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ===== PROFILE MANAGEMENT =====
function loadProfileData() {
    if (!currentUser) return;

    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const passwordInput = document.getElementById('profilePasswordInput');
    const preview = document.getElementById('profilePreview');

    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (passwordInput) passwordInput.value = '';
    if (preview && currentUser.profilePicture) {
        preview.src = currentUser.profilePicture;
    }
}

async function updateProfile() {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }

    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const passwordInput = document.getElementById('profilePasswordInput');
    const fileInput = document.getElementById('profilePictureInput');

    if (!nameInput) {
        showToast('Profile form not found', 'error');
        return;
    }

    const name = nameInput.value.trim();
    const password = passwordInput ? passwordInput.value : '';
    const file = fileInput ? fileInput.files[0] : null;

    if (!name) {
        showToast('Name is required', 'error');
        return;
    }

    // Update user object
    currentUser.name = name;

    if (password) {
        // In production, hash and update password
        currentUser.password = password;
    }

    // Handle profile picture upload
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            currentUser.profilePicture = e.target.result;
            // In production, upload to Supabase Storage
            updateUserInfo();
            await saveSupabaseProfile(currentUser);
            showToast('Profile updated successfully!', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        updateUserInfo();
        await saveSupabaseProfile(currentUser);
        showToast('Profile updated successfully!', 'success');
    }
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

    try {
        if (currentUser?.supabaseUser && window.eduhubSupabaseEnabled) {
            // Delete from Supabase
            await window.eduhubSupabase.auth.admin.deleteUser(currentUser.id);
        }

        // Clear local data
        logout();
        showToast('Account deleted successfully', 'success');
    } catch (error) {
        showToast('Error deleting account', 'error');
        console.error('Delete account error:', error);
    }
}

function previewProfilePicture() {
    const file = document.getElementById('profilePictureInput')?.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// ===== TIMER & MENTAL HEALTH ACTIVITIES =====
let timerInterval = null;
let timerSeconds = 0;
let studyInterval;
let studyTime = 1500;

function startStudyTimer() {
    clearInterval(studyInterval);

    studyInterval = setInterval(() => {
        studyTime--;

        const minutes = Math.floor(studyTime / 60);
        const seconds = studyTime % 60;

        const display = document.getElementById("studyTimerDisplay");

        if (display) {
            display.innerText =
                `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        if (studyTime <= 0) {
            clearInterval(studyInterval);
        }
    }, 1000);
}

function startMeditationTimer(duration = 300) {
    // duration in seconds (default 5 minutes)
    timerSeconds = duration;
    
    // Show meditation timer section
    const section = document.getElementById('meditationTimerSection');
    if (section) section.style.display = 'block';
    
    updateTimerDisplay();
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimerComplete('meditation');
        }
    }, 1000);
}

function startStressReliefTimer(duration = 300) {
    // Breathing exercise: 4-7-8 technique (total ~5 minutes)
    timerSeconds = duration;
    
    // Show stress relief timer section
    const section = document.getElementById('stressReliefTimerSection');
    if (section) section.style.display = 'block';
    
    updateTimerDisplay();
    
    if (timerInterval) clearInterval(timerInterval);
    
    let breathStep = 0;
    const breathCycle = [
        { instruction: 'Inhale... (4 seconds)', duration: 4 },
        { instruction: 'Hold... (7 seconds)', duration: 7 },
        { instruction: 'Exhale... (8 seconds)', duration: 8 }
    ];
    
    let cycleIndex = 0;
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        // Update breathing instruction
        const breath = breathCycle[cycleIndex % breathCycle.length];
        const instructionEl = document.getElementById('breathInstruction');
        if (instructionEl) {
            instructionEl.textContent = breath.instruction;
        }
        
        cycleIndex++;
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimerComplete('stress-relief');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const displayText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update meditation timer
    const medCircle = document.getElementById('meditateCircle');
    if (medCircle) {
        medCircle.textContent = timerSeconds + 's';
    }
    
    // Update stress relief timer
    const stressCircle = document.getElementById('stressCircle');
    if (stressCircle) {
        stressCircle.textContent = displayText;
    }
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        const pauseBtn = document.querySelector('[onclick="pauseTimer()"]');
        if (pauseBtn) pauseBtn.textContent = 'Resume';
    } else {
        // Resume
        startMeditationTimer(timerSeconds);
        const pauseBtn = document.querySelector('[onclick="pauseTimer()"]');
        if (pauseBtn) pauseBtn.textContent = 'Pause';
    }
}

function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 0;
    updateTimerDisplay();
    
    // Hide both timer sections
    const medSection = document.getElementById('meditationTimerSection');
    const stressSection = document.getElementById('stressReliefTimerSection');
    if (medSection) medSection.style.display = 'none';
    if (stressSection) stressSection.style.display = 'none';
}

function onTimerComplete(type) {
    const messageEl = type === 'meditation' 
        ? document.getElementById('message')
        : document.getElementById('stressMessage');
    
    if (messageEl) {
        messageEl.textContent = type === 'meditation'
            ? "Well done! You've completed your meditation. 🧘"
            : "Great job! You've completed your breathing exercise. 🌟";
    }
    
    showToast(
        type === 'meditation'
            ? 'Meditation session completed!'
            : 'Stress relief session completed!',
        'success'
    );
}

// ===== CHAT SYSTEM =====
function openChatWindow() {
    document.getElementById('chatWindow').classList.add('active');
    document.getElementById('chatInput').focus();
}

function closeChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.classList.remove('active');
    chatWindow.classList.remove('maximized');
}

function maximizeChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.classList.toggle('maximized');
}

function toggleChatMaximize() {
    const chatBox = document.querySelector('#mental-health .chat-container');
    if (!chatBox) return;
    chatBox.classList.toggle('maximized');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function formatBotResponse(text) {
    if (typeof marked !== 'undefined' && marked.parse) {
        return marked.parse(text ?? '');
    }

    return escapeHtml(text ?? '');
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat history
    const chatHistory = currentChatbot === 'saarthi' ? saarthiChatHistory : mindcareChatHistory;
    chatHistory.push({ role: 'user', content: message });

    // Add user message to chat UI
    addMessageToChat(message, 'user');
    input.value = '';

    // Show loading state
    showChatLoader();

    try {
        const response = await getChatbotResponse(message, chatHistory);

        // Add bot response to chat history
        chatHistory.push({ role: 'assistant', content: response });

        // Remove loader and add bot response
        removeChatLoader();
        addMessageToChat(response, 'bot');

        // Save chat history to localStorage
        saveChatHistory();

    } catch (error) {
        removeChatLoader();
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
        console.error('Chat error:', error);
    }
}

async function getChatbotResponse(prompt, chatHistory) {
    const context = currentChatbot === 'saarthi' ? 'study' : 'mental_health';
    
    try {
        // Use correct backend API URL on localhost:3000
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: prompt,
                context: context,
                chatHistory: chatHistory.slice(-10) // Send last 10 messages for context
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.response || 'I did not understand that. Please try again.';
        } else {
            console.warn(`API returned status ${response.status}, using fallback`);
            return getFallbackResponse(prompt, context);
        }
    } catch (error) {
        console.error('API call error:', error);
        return getFallbackResponse(prompt, context);
    }
}

function getFallbackResponse(prompt, context) {
    if (context === 'mental_health') {
        return "I'm here to listen and support you. While I can't provide professional medical advice, I can offer general guidance and suggest helpful resources. Would you like me to recommend some mental health resources or coping strategies?";
    } else {
        return 'I am here to help with your studies! Feel free to ask me about any subject, skill, or learning concept. I can provide definitions, key points, and more information to help you learn better.';
    }
}

function switchChatbot(chatbot) {
    currentChatbot = chatbot;

    // Update UI
    const saarthiBtn = document.getElementById('saarthiBtn');
    const mindcareBtn = document.getElementById('mindcareBtn');

    if (saarthiBtn && mindcareBtn) {
        saarthiBtn.classList.toggle('active', chatbot === 'saarthi');
        mindcareBtn.classList.toggle('active', chatbot === 'mindcare');
    }

    // Clear current chat and load history
    clearChatMessages();
    loadChatHistory();

    // Add welcome message for the selected chatbot
    const welcomeMessage = chatbot === 'saarthi'
        ? "Hey! I'm Saarthi, your online study mate. How can I help you today? 📚"
        : "Hello! I'm MindCare AI, your mental health companion. I'm here to listen and support you. How are you feeling today? 💙";

    addMessageToChat(welcomeMessage, 'bot');

    showToast(`Switched to ${chatbot === 'saarthi' ? 'Saarthi' : 'MindCare AI'}`, 'info');
}

function clearChatMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
}

function loadChatHistory() {
    const chatHistory = currentChatbot === 'saarthi' ? saarthiChatHistory : mindcareChatHistory;

    chatHistory.forEach(msg => {
        addMessageToChat(msg.content, msg.role === 'user' ? 'user' : 'bot');
    });
}

function saveChatHistory() {
    const chatData = {
        saarthi: saarthiChatHistory,
        mindcare: mindcareChatHistory,
        lastChatbot: currentChatbot
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatData));
}

function loadSavedChatHistory() {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
        try {
            const chatData = JSON.parse(saved);
            saarthiChatHistory = chatData.saarthi || [];
            mindcareChatHistory = chatData.mindcare || [];
            currentChatbot = chatData.lastChatbot || 'saarthi';
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
}

function addMessageToChat(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const displayMessage = sender === 'bot' ? formatBotResponse(message) : escapeHtml(message);
    messageDiv.innerHTML = `
        <div class="chat-bubble">${displayMessage}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showChatLoader() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'chatLoader';
    loaderDiv.className = 'chat-message bot';
    loaderDiv.innerHTML = `
        <div class="chat-bubble"><span class="loader"></span></div>
    `;
    messagesContainer.appendChild(loaderDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeChatLoader() {
    document.getElementById('chatLoader')?.remove();
}

// ===== MENTAL HEALTH CHAT =====
async function sendMentalHealthMessage() {
    const input = document.getElementById('mentalHealthInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addMentalHealthMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    showMentalHealthTyping();

    try {
        // Call backend for mental health response
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: 'mental_health'
            })
        });

        if (response.ok) {
            const data = await response.json();
            hideMentalHealthTyping();
            addMentalHealthMessage(data.response, 'bot');
        } else {
            throw new Error('Failed to get response');
        }
    } catch (error) {
        console.error('Mental health chat error:', error);
        hideMentalHealthTyping();
        addMentalHealthMessage("I'm here to listen. While I can't provide professional medical advice, I can offer general support and suggest resources. Would you like me to recommend some helpful resources?", 'bot');
    }
}

function handleMentalHealthKeyPress(event) {
    if (event.key === 'Enter') {
        sendMentalHealthMessage();
    }
}

function addMentalHealthMessage(message, sender) {
    const messagesContainer = document.getElementById('mentalHealthMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const avatar = sender === 'bot' ?
        '<i class="fas fa-heart"></i>' :
        '<i class="fas fa-user"></i>';

    const displayMessage = sender === 'bot' ? formatBotResponse(message) : `<p>${escapeHtml(message)}</p>`;

    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content">
            ${displayMessage}
            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showMentalHealthTyping() {
    const messagesContainer = document.getElementById('mentalHealthMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-message';
    typingDiv.id = 'mentalHealthTyping';

    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-heart"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideMentalHealthTyping() {
    const typingDiv = document.getElementById('mentalHealthTyping');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// ===== DASHBOARD FEATURES =====
function showStudyProgress() {
    document.getElementById('progressTitle').innerHTML = '<i class="fas fa-book"></i> Study Progress';
    openProgressModal('study');
}

function showSkillProgress() {
    document.getElementById('progressTitle').innerHTML = '<i class="fas fa-trophy"></i> Skill Progress';
    openProgressModal('skill');
}

function openProgressModal(type) {
    const progressList = document.getElementById('progressList');
    const data = trackingData.progress;

    const progressHTML = Object.entries(data).map(([subject, percentage]) => `
        <div class="progress-item">
            <div class="progress-header">
                <span class="progress-title">${subject.replace('-', ' ').toUpperCase()}</span>
                <span class="progress-percentage">${percentage}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `).join('');

    progressList.innerHTML = progressHTML;
    document.getElementById('progressModal').classList.add('active');
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('active');
}

function showGoals() {
    openGoalsModal();
}

function openGoalsModal() {
    const goalsList = document.getElementById('goalsList');

    if (trackingData.goals.length === 0) {
        goalsList.innerHTML = '<p style="opacity: 0.7;">No goals set yet. Create your first learning goal!</p>';
    } else {
        const goalsHTML = trackingData.goals.map((goal, index) => `
            <div class="goal-card">
                <div class="goal-header">
                    <div>
                        <h4>${goal.title}</h4>
                        <p>${goal.description}</p>
                    </div>
                    <button class="action-btn" onclick="deleteGoal(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="goal-priority ${goal.priority}">
                    ${goal.priority.toUpperCase()} PRIORITY
                </div>
                <label style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" onchange="toggleGoalComplete(${index})" ${goal.completed ? 'checked' : ''}>
                    <span style="opacity: ${goal.completed ? 0.5 : 1};">Mark as complete</span>
                </label>
            </div>
        `).join('');
        goalsList.innerHTML = goalsHTML;
    }

    document.getElementById('goalsModal').classList.add('active');
}

function closeGoalsModal() {
    document.getElementById('goalsModal').classList.remove('active');
}

function addGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const description = document.getElementById('goalDescription').value.trim();
    const priority = document.getElementById('goalPriority').value;

    if (!title) {
        showToast('Please enter a goal title', 'error');
        return;
    }

    trackingData.goals.push({
        title,
        description,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    });

    showToast('Goal added successfully!', 'success');
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalPriority').value = 'medium';

    openGoalsModal();
}

function toggleGoalComplete(index) {
    trackingData.goals[index].completed = !trackingData.goals[index].completed;
    openGoalsModal();
}

function deleteGoal(index) {
    if (confirm('Delete this goal?')) {
        trackingData.goals.splice(index, 1);
        showToast('Goal deleted', 'success');
        openGoalsModal();
    }
}

function showReports() {
    openReportsModal();
}

function openReportsModal() {
    document.getElementById('reportsModal').classList.add('active');

    // Initialize charts
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function closeReportsModal() {
    document.getElementById('reportsModal').classList.remove('active');
}

function initializeCharts() {
    if (typeof Chart === 'undefined') {
        showToast('Charts are unavailable because Chart.js did not load.', 'error');
        return;
    }

    // Subjects Chart (Pie)
    const subjectsCtx = document.getElementById('subjectsChart');
    if (subjectsCtx && !window.subjectsChartInstance) {
        window.subjectsChartInstance = new Chart(subjectsCtx, {
            type: 'pie',
            data: {
                labels: ['Web Development', 'Python', 'Data Science', 'Machine Learning'],
                datasets: [{
                    data: [45, 65, 30, 50],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#4facfe'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'white',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // Downloads Chart (Bar)
    const downloadsCtx = document.getElementById('downloadsChart');
    if (downloadsCtx && !window.downloadsChartInstance) {
        window.downloadsChartInstance = new Chart(downloadsCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Downloads',
                    data: [12, 19, 8, 15],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#4facfe'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }
}

// ===== FILTER SYSTEM =====
function onFilterTypeChange(type) {
    const filterType = document.getElementById(`${type}FilterType`).value;
    const filterValue = document.getElementById(`${type}FilterValue`);

    if (filterType) {
        filterValue.disabled = false;
        populateFilterValues(type, filterType);
    } else {
        filterValue.disabled = true;
        filterValue.innerHTML = '<option value="">Select value</option>';
    }

    // Clear current filter
    filterValue.value = '';
    applyFilter(type);
}

function populateFilterValues(type, filterType) {
    const select = document.getElementById(`${type}FilterValue`);
    const options = filterType === 'class' ?
        ['nursery','lkg','ukg','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','everyone'] :
        ['everyone','btech','bca','mca','mtech','bba','mba'];

    select.innerHTML = '<option value="">Select value</option>' +
        options.map(opt => `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('');
}

function applyFilter(type) {
    const filterType = document.getElementById(`${type}FilterType`).value;
    const filterValue = document.getElementById(`${type}FilterValue`).value;

    if (type === 'book') {
        loadBooks(currentSubject, filterType, filterValue);
    } else {
        loadVideos(currentSubject, filterType, filterValue);
    }
}

function applyFilters() {
    studentResourceFilters = {
        class: document.getElementById('classFilter')?.value || '',
        course: document.getElementById('courseFilter')?.value || ''
    };

    loadBooks(currentSubject, studentResourceFilters);
    loadVideos(currentSubject, studentResourceFilters);
}

function clearStudentFilters() {
    studentResourceFilters = {
        class: '',
        course: ''
    };

    const classFilter = document.getElementById('classFilter');
    const courseFilter = document.getElementById('courseFilter');
    if (classFilter) classFilter.value = '';
    if (courseFilter) courseFilter.value = '';

    loadBooks(currentSubject);
    loadVideos(currentSubject);
}

function clearFilter(type) {
    document.getElementById(`${type}FilterType`).value = '';
    document.getElementById(`${type}FilterValue`).value = '';
    document.getElementById(`${type}FilterValue`).disabled = true;

    if (type === 'book') {
        loadBooks(currentSubject);
    } else {
        loadVideos(currentSubject);
    }
}

// ===== UTILITY FUNCTIONS =====
async function downloadBook(bookId) {
    try {
        const book = await DataManager.getBookById(bookId);
        if (!book) {
            showToast('Book not found', 'error');
            return;
        }

        trackDownload(bookId);
        showToast('Downloading book...', 'info');

        // Use public URL directly (already stored in book.file_url)
        const downloadUrl = book.file_url;

        if (!downloadUrl) {
            showToast('Download link not available', 'error');
            return;
        }

        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = book.title + '.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download book', 'error');
    }
}

function openYouTube(url) {
    try {
        // Extract video ID or use URL as key for tracking
        const videoId = new URL(url).searchParams.get('v') || url;
        trackVideoView(videoId);
        window.open(url, '_blank');
        showToast('Opening video...', 'info');
    } catch (error) {
        showToast('Unable to open link', 'error');
    }
}

// Track resource downloads
function trackDownload(resourceId) {
    trackingData.downloads[resourceId] = (trackingData.downloads[resourceId] || 0) + 1;
}

// Track video views
function trackVideoView(videoId) {
    trackingData.videoClicks[videoId] = (trackingData.videoClicks[videoId] || 0) + 1;
}

// ===== DRAG & DROP =====
function setupDragDrop() {
    const dropZone = document.getElementById('bookDropZone');
    const fileInput = document.getElementById('bookFile');
    const fileName = document.getElementById('bookFileName');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = event.dataTransfer.files;
        if (!files.length) return;
        const file = files[0];
        if (file.type !== 'application/pdf') {
            showToast('Please drop a PDF file', 'error');
            return;
        }
        fileInput.files = files;
        fileName.textContent = file.name;
        dropZone.textContent = `Selected: ${file.name}`;
    });
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        fileName.textContent = file ? file.name : 'No file selected';
        dropZone.textContent = file ? `Selected: ${file.name}` : 'Drag & drop PDF here or click to choose file';
    });
}

// ===== THEME =====
function setupThemeToggle() {
    const theme = localStorage.getItem('eduTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('eduTheme', nextTheme);
    showToast(`Switched to ${nextTheme}`, 'info');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== UTILITIES =====
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || '';
            const base64 = result.split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function scrollToBottom() {
    const chat = document.querySelector(".chat-messages");
    chat.scrollTop = chat.scrollHeight;
}

// ===== GLOBAL WINDOW FUNCTIONS =====
window.selectRole = selectRole;
// window.handleAdminLogin = handleAdminLogin;
window.signInWithGoogle = signInWithGoogle;
window.openProfilePage = openProfilePage;
window.navigate = navigate;
window.showSection = showSection;
window.toggleSidebarFromBook = toggleSidebarFromBook;
window.toggleContent = toggleContent;
window.openSubjectDetail = openSubjectDetail;
window.openSkillDetail = openSkillDetail;
window.closeDetailModal = closeDetailModal;
window.switchDetailTab = switchDetailTab;
window.showUploadBook = showUploadBook;
window.uploadBook = uploadBook;
window.showAddVideo = showAddVideo;
window.addVideo = addVideo;
window.editBook = editBook;
window.saveBookEdit = saveBookEdit;
window.deleteBook = deleteBook;
window.editVideo = editVideo;
window.saveVideoEdit = saveVideoEdit;
window.deleteVideo = deleteVideo;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.editSkill = editSkill;
window.deleteSkill = deleteSkill;
window.showAddSubject = showAddSubject;
window.closeSubjectModal = closeSubjectModal;
window.saveNewSubject = saveNewSubject;
window.showAddSkill = showAddSkill;
window.closeSkillModal = closeSkillModal;
window.saveNewSkill = saveNewSkill;
window.loadProfileData = loadProfileData;
window.updateProfile = updateProfile;
window.deleteAccount = deleteAccount;
window.previewProfilePicture = previewProfilePicture;
window.openChatWindow = openChatWindow;
window.closeChatWindow = closeChatWindow;
window.maximizeChatWindow = maximizeChatWindow;
window.toggleChatMaximize = toggleChatMaximize;
window.switchChatbot = switchChatbot;
window.sendChatMessage = sendChatMessage;
window.sendMentalHealthMessage = sendMentalHealthMessage;
window.handleMentalHealthKeyPress = handleMentalHealthKeyPress;
window.showStudyProgress = showStudyProgress;
window.showSkillProgress = showSkillProgress;
window.showGoals = showGoals;
window.showReports = showReports;
window.openProgressModal = openProgressModal;
window.closeProgressModal = closeProgressModal;
window.openGoalsModal = openGoalsModal;
window.closeGoalsModal = closeGoalsModal;
window.addGoal = addGoal;
window.toggleGoalComplete = toggleGoalComplete;
window.deleteGoal = deleteGoal;
window.openReportsModal = openReportsModal;
window.closeReportsModal = closeReportsModal;
window.initializeCharts = initializeCharts;
window.onFilterTypeChange = onFilterTypeChange;
window.applyFilter = applyFilter;
window.applyFilters = applyFilters;
window.clearFilter = clearFilter;
window.clearStudentFilters = clearStudentFilters;
window.onBookSearch = (e) => {
    bookSearchTerm = e.target.value.toLowerCase();
    loadBooks(currentSubject, studentResourceFilters);
};
window.downloadBook = downloadBook;
window.openYouTube = openYouTube;
window.setupDragDrop = setupDragDrop;
window.setupThemeToggle = setupThemeToggle;
window.toggleTheme = toggleTheme;
window.showToast = showToast;
window.startMeditationTimer = startMeditationTimer;
window.startStressReliefTimer = startStressReliefTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.updateTimerDisplay = updateTimerDisplay;
