# EduHub Supabase Setup Guide

## Overview
EduHub is a student platform using Supabase for authentication, database, and storage. This guide explains how to configure Supabase for the app.

## Prerequisites
- Supabase account (free at supabase.com)
- Node.js installed
- Basic knowledge of Supabase dashboard

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. Fill in:
   - Name: `eduhub-project`
   - Database Password: Choose a strong password
   - Region: Select closest to your users
5. Click "Create new project"

## Step 2: Get Project Credentials
1. In your Supabase dashboard, go to Settings > API
2. Copy:
   - Project URL: `https://your-project-id.supabase.co`
   - Anon public key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Configure Frontend
Edit `frontend/supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
const SUPABASE_BUCKET = 'books';
```

## Step 4: Configure Backend
Edit `backend/config.js` (add these lines):

```javascript
supabaseUrl: process.env.SUPABASE_URL || 'https://your-project-id.supabase.co',
supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key-here',
supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '', // For server-side operations
supabaseBucket: process.env.SUPABASE_BUCKET || 'books'
```

## Step 5: Enable Google OAuth
1. In Supabase dashboard, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
4. Set Redirect URLs:
   - `http://localhost:3000` (for development)
   - Your production domain

## Step 6: Create Database Tables
Run these SQL commands in Supabase SQL Editor:

```sql
-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'student',
    profile_picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT,
    class TEXT DEFAULT '',
    course TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    class TEXT DEFAULT '',
    course TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Skills table
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Insert default data
INSERT INTO subjects (id, name) VALUES
('web-dev', 'Web Development'),
('python', 'Python Programming'),
('data-science', 'Data Science'),
('machine-learning', 'Machine Learning');

INSERT INTO skills (id, name) VALUES
('web-dev', 'Web Development'),
('javascript', 'JavaScript'),
('graphic-design', 'Graphic Design');
```

## Step 7: Configure Storage
1. In Supabase dashboard, go to Storage
2. Create a new bucket named `books`
3. Set bucket to public
4. Configure CORS if needed

## Step 8: Environment Variables (Optional)
Create `.env` file in backend folder:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_BUCKET=books
GROQ_API_KEY=your-groq-key
```

## Step 9: Run the App
1. Start backend: `cd backend && node server.js`
2. Open frontend: Open `frontend/index.html` in browser
3. Or serve frontend: Use a local server like `npx serve frontend`

## Troubleshooting
- **Login not working**: Check OAuth redirect URLs
- **Books not uploading**: Check storage bucket permissions
- **Chat not responding**: Check Groq API key in backend
- **CORS errors**: Ensure Supabase CORS settings allow your domain

## Security Notes
- Never commit real API keys to Git
- Use environment variables for production
- Enable Row Level Security (RLS) on tables if needed
- Regularly rotate API keys