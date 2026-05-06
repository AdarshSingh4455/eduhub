# EduHub Supabase Setup Guide

This guide provides complete setup instructions for configuring Supabase for the EduHub application.

---

## 🔧 Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Create a new project:
   - **Project Name**: EduHub
   - **Database Password**: Set a strong password (save this!)
   - **Region**: Choose closest to your location
4. Wait for project creation (2-3 minutes)

---

## 🗄️ Step 2: Create Database Tables

Run these SQL queries in Supabase SQL Editor (SQL menu → New Query):

### Create Books Table

```sql
CREATE TABLE public.books (
    id BIGSERIAL PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    file_path TEXT,
    class TEXT DEFAULT '',
    course TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_books_subject_id ON public.books(subject_id);
CREATE INDEX idx_books_class ON public.books(class);
CREATE INDEX idx_books_course ON public.books(course);
```

### Create Videos Table

```sql
CREATE TABLE public.videos (
    id BIGSERIAL PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    class TEXT DEFAULT '',
    course TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_videos_subject_id ON public.videos(subject_id);
CREATE INDEX idx_videos_class ON public.videos(class);
CREATE INDEX idx_videos_course ON public.videos(course);
```

### Create Subjects Table

```sql
CREATE TABLE public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subjects
INSERT INTO public.subjects (id, name) VALUES
    ('web-dev', 'Web Development'),
    ('python', 'Python Programming'),
    ('data-science', 'Data Science'),
    ('machine-learning', 'Machine Learning');
```

### Create Skills Table

```sql
CREATE TABLE public.skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default skills
INSERT INTO public.skills (id, name) VALUES
    ('web-dev', 'Web Development'),
    ('javascript', 'JavaScript'),
    ('graphic-design', 'Graphic Design');
```

### Create Profiles Table (for user data)

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'student',
    profile_picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 Step 3: Set Up Row Level Security (RLS) Policies

Run these queries to set up RLS policies:

### Enable RLS on Tables

```sql
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Books Table Policies

```sql
-- Allow anyone to read books
CREATE POLICY "books_select_policy" ON public.books
    FOR SELECT USING (true);

-- Allow authenticated users to insert books
CREATE POLICY "books_insert_policy" ON public.books
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update books
CREATE POLICY "books_update_policy" ON public.books
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow authenticated users to delete books
CREATE POLICY "books_delete_policy" ON public.books
    FOR DELETE USING (true);
```

### Videos Table Policies

```sql
-- Allow anyone to read videos
CREATE POLICY "videos_select_policy" ON public.videos
    FOR SELECT USING (true);

-- Allow authenticated users to insert videos
CREATE POLICY "videos_insert_policy" ON public.videos
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update videos
CREATE POLICY "videos_update_policy" ON public.videos
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow authenticated users to delete videos
CREATE POLICY "videos_delete_policy" ON public.videos
    FOR DELETE USING (true);
```

### Subjects Table Policies

```sql
-- Allow anyone to read subjects
CREATE POLICY "subjects_select_policy" ON public.subjects
    FOR SELECT USING (true);

-- Allow authenticated users to insert subjects
CREATE POLICY "subjects_insert_policy" ON public.subjects
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update subjects
CREATE POLICY "subjects_update_policy" ON public.subjects
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow authenticated users to delete subjects
CREATE POLICY "subjects_delete_policy" ON public.subjects
    FOR DELETE USING (true);
```

### Skills Table Policies

```sql
-- Allow anyone to read skills
CREATE POLICY "skills_select_policy" ON public.skills
    FOR SELECT USING (true);

-- Allow authenticated users to insert skills
CREATE POLICY "skills_insert_policy" ON public.skills
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update skills
CREATE POLICY "skills_update_policy" ON public.skills
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow authenticated users to delete skills
CREATE POLICY "skills_delete_policy" ON public.skills
    FOR DELETE USING (true);
```

### Profiles Table Policies

```sql
-- Allow users to read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

---

## 🪣 Step 4: Set Up Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **Create Bucket**
3. Enter bucket name: `books`
4. **Make sure to check "Public bucket"** ✅
5. Click **Create Bucket**

### Set Storage Policies

In the **Storage** → **Policies** section for the "books" bucket, add:

```sql
-- Allow anyone to read files
CREATE POLICY "public_read_books"
ON storage.objects
FOR SELECT
USING (bucket_id = 'books');

-- Allow authenticated users to upload files
CREATE POLICY "authenticated_upload_books"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'books' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "authenticated_delete_books"
ON storage.objects
FOR DELETE
USING (bucket_id = 'books' AND auth.role() = 'authenticated');
```

---

## 🔑 Step 5: Get Your Credentials

1. Go to **Project Settings** (gear icon)
2. Click **API** tab
3. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_KEY` (Keep this private!)

---

## 📝 Step 6: Configure Environment Variables

### Create `.env` file in `/backend` directory:

```bash
PORT=3000
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_BUCKET=books
```

### Update `frontend/supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key_here';
const SUPABASE_BUCKET = 'books';
```

**Note**: The anon key is safe to expose in frontend code. The service role key should only be used on the backend.

---

## 🚀 Step 7: Verify Configuration

Run this to check if everything is working:

```bash
cd backend
node server.js
```

You should see:
```
EduHub backend running at http://localhost:3000
```

---

## ✅ Step 8: Test the Application

1. Open http://localhost:3000 in your browser
2. Try logging in (admin@gmail.com / admin123)
3. Try uploading a PDF file
4. Verify files appear after refresh
5. Test downloading files

---

## 🐛 Troubleshooting

### Issue: 400 Error on Upload

**Solution**: 
- Verify bucket exists and is **PUBLIC**
- Check storage policies are applied
- Verify `SUPABASE_BUCKET` matches exactly

### Issue: 401 RLS Error

**Solution**:
- Run all RLS policy SQL queries
- Make sure policies allow BOTH authenticated AND unauthenticated access for public data
- Verify `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` was executed

### Issue: Books not appearing after upload

**Solution**:
- Check browser console for errors
- Verify public URL is being stored in database
- Try accessing URL directly in browser

### Issue: Chat API returns 405

**Solution**:
- Make sure backend is running: `node server.js`
- Check `/api/chat` endpoint exists in `server.js`
- Verify method is POST

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

---

## ✨ You're All Set!

Your EduHub application is now fully configured with Supabase. Start uploading content and enjoy!
