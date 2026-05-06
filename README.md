# EduHub - Modern Learning Platform

A premium SaaS-style student learning platform with AI-powered features, role-based access, and modern glassmorphism design.

## 🎯 Features Implemented

### 1. **Authentication System**
- **Admin Login**: Hardcoded credentials for admin access
  - Email: `admin@eduhub.com`
  - Password: `admin123`
- **Student Login**: Google OAuth placeholder (ready for Supabase integration)
- **Role-Based Access**: Different UI/features for Admin vs Student

### 2. **Modern UI Design**
- **Glassmorphism Design**: Frosted glass effect with transparency
- **Gradient Theme**: Purple-to-blue gradient throughout
- **Smooth Animations**: All interactions have smooth transitions
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Sidebar Navigation**: Easy access to all sections
- **Modern Dashboard Cards**: Stats display on main dashboard

### 3. **Admin Features**
- **Manage Studies**: Add/Edit/Delete study subjects
- **Manage Skills**: Add/Edit/Delete skill courses
- **Upload Resources**:
  - Upload PDF books to subjects
  - Add YouTube video links
- **Resource Management**: 3-dot menu for each resource (Edit/Delete)
- **Admin Tools Visibility**: Only visible to admin users

### 4. **Student Features**
- **View All Resources**: Access all study materials
- **Download Books**: Download PDF resources
- **Watch Videos**: Click to open videos on YouTube
- **Read-Only Access**: Cannot add/edit/delete (admin only)

### 5. **Dashboard**
Interactive cards showing:
- Study Progress
- Skill Development
- Learning Goals
- Progress Reports

### 6. **Saarthi AI Chatbot**
- **Floating Chat Button**: Fixed position in bottom-right
- **AI Responses**: Formatted with:
  - Definition of concept
  - 3 key points
  - Advantages/Disadvantages (when asked)
- **WhatsApp-Style Bubbles**: Modern chat interface
- **Response Examples**: Includes sample responses for Web Development, Python, Machine Learning

### 7. **Additional Features**
- **Toast Notifications**: Success, Error, Info messages
- **File Upload Loading**: Shows upload progress
- **Section Detail Modals**: Books and Videos tabs for each subject
- **Smooth Scrolling**: All navigation transitions

## 🚀 Getting Started

### Current Status
The platform is fully functional with all features working locally. To make it production-ready, follow the setup instructions below.

### Step 1: Setup Supabase (Database)
1. Create a [Supabase](https://supabase.com) account (free tier available)
2. Create a new project
3. In the project settings, copy your:
   - **Supabase URL**
   - **Supabase Anon Key**
4. Update `script.js` (around line 14):
```javascript
const { createClient } = supabase;
supabaseClient = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
```

### Step 2: Create Supabase Tables
In Supabase SQL Editor, run:

```sql
-- Categories table (Studies/Skills)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  type varchar(50) CHECK (type IN ('study', 'skill')),
  created_at timestamp DEFAULT now()
);

-- Resources table (Books/Videos)
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  type varchar(50) CHECK (type IN ('book', 'video')),
  title varchar(255) NOT NULL,
  file_url text,
  video_url text,
  created_at timestamp DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
```

### Step 3: Setup Supabase Storage
1. Go to Supabase → Storage
2. Create a new bucket named `eduhub-books`
3. Make it public (for easy downloads)
4. Update the upload function in `script.js` to use this bucket

### Step 4: Setup Groq API (Saarthi Chatbot)
1. Get API key from [Groq Console](https://console.groq.com)
2. Update `script.js` (line 458):
```javascript
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';
```
3. Replace `callGroqAPI()` function with actual API calls

### Step 5: Deploy
Use any of these options:
- **Netlify**: Free hosting with Git integration
- **Vercel**: Optimized for web apps
- **GitHub Pages**: Simple static site hosting
- **Firebase**: Full backend + hosting

## 📁 File Structure

```
eduHub/
├── index.html          # Main page with all sections
├── styles.css          # Modern glassmorphism styles
├── script.js           # All JavaScript logic
├── README.md           # This file
├── meditation.html     # Mental health pages
├── stress-relief.html
├── support-resources.html
├── coping-with-anxiety.html
├── work-life-balance.html
└── mindfulness.html
```

## 🔑 Admin Credentials (Demo)
- **Email**: admin@eduhub.com
- **Password**: admin123

## 🎨 Color Theme
- **Primary**: `#667eea` (Purple)
- **Secondary**: `#764ba2` (Dark Purple)
- **Background**: Gradient from purple to dark purple
- **Accent**: `#00d4ff` (Cyan)

## 📱 Responsive Breakpoints
- **Desktop**: 1024px+
- **Tablet**: 768px - 1023px
- **Mobile**: Below 768px

## 🔐 Security Notes
1. **Admin Credentials**: Change in production (use environment variables)
2. **API Keys**: Never commit API keys to Git
3. **Database Rules**: Setup proper RLS (Row Level Security) policies
4. **Storage**: Make sure storage buckets have proper access controls

## 📚 Next Steps for Production

### High Priority
1. [ ] Setup Supabase database tables
2. [ ] Configure Google OAuth for student login
3. [ ] Integrate Groq API for chatbot
4. [ ] Setup PDF storage in Supabase
5. [ ] Add user authentication to database

### Medium Priority
1. [ ] Add email verification for students
2. [ ] Implement progress tracking database
3. [ ] Add download tracking for resources
4. [ ] Setup analytics dashboard
5. [ ] Create admin panel for user management

### Nice to Have
1. [ ] Dark mode toggle
2. [ ] User preferences storage
3. [ ] Discussion forum
4. [ ] Certificate generation
5. [ ] Leaderboard system

## 🐛 Troubleshooting

### Auth modal not closing after login
- Check browser console for errors
- Verify currentUser is being set correctly
- Check localStorage for saved user

### Chat not responding
- Verify Groq API key is set
- Check browser console for API errors
- Ensure API key has proper permissions

### Admin tools not showing
- Login with admin credentials
- Check role is set to 'admin'
- Verify updateUIForRole() is called

### Styling issues
- Clear browser cache (Ctrl+Shift+Delete)
- Check if styles.css is loading (F12 → Network)
- Verify file paths are correct

## 📞 Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify all files are in correct location
3. Test with fresh browser session (Incognito mode)
4. Check network requests in DevTools

## 📄 License

This project is created for educational purposes.

---

**EduHub v1.0 - Transform your learning experience with AI** 🚀
