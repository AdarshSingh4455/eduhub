# EduHub - Quick Start Guide

This guide will help you get the EduHub application running locally on your computer.

---

## 📋 Prerequisites

Make sure you have installed:
- **Node.js** (v16 or higher): https://nodejs.org/
- **Git** (optional, for version control): https://git-scm.com/

Verify installation:
```bash
node --version
npm --version
```

---

## 🎯 Step 1: Supabase Setup (IMPORTANT!)

Before running the application, you MUST set up Supabase:

1. Follow the complete guide in `SUPABASE_SETUP_GUIDE.md`
2. Copy your credentials to `.env` file in `/backend`
3. Update `frontend/supabase-config.js` with your Supabase URL and key

**Without Supabase setup, file upload and storage features will not work.**

---

## ⚙️ Step 2: Install Dependencies

You don't need to install dependencies! The application uses:
- **Frontend**: Only JavaScript and HTML (no build step needed)
- **Backend**: Node.js built-in modules

The application is lightweight and dependencies-free for production-like behavior.

---

## 🔑 Step 3: Configure Environment Variables

Create a `.env` file in the `/backend` directory:

```bash
cd backend
```

Create `.env` file with:

```
PORT=3000
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_BUCKET=books
```

**Get these values from your Supabase project settings.**

---

## 🚀 Step 4: Start the Backend Server

```bash
cd backend
node server.js
```

You should see:
```
EduHub backend running at http://localhost:3000
```

---

## 🌐 Step 5: Open in Browser

1. Open your web browser
2. Go to: **http://localhost:3000**
3. You should see the EduHub login page

---

## 👤 Step 6: Login

### Student Login:
- **Method**: Click "Google Sign-In" (requires Supabase OAuth setup)
- **Alternative**: Use demo data (no authentication required)

### Admin Login:
- **Email**: `admin@gmail.com`
- **Password**: `admin123`

---

## ✨ Step 7: Test Features

### Test File Upload (Admin):
1. Login as admin
2. Go to **Studies** section
3. Click **Explore Resources**
4. In detail modal, click **Upload PDF**
5. Select a PDF file and upload
6. Refresh page - file should appear

### Test Chat:
1. Click **Chat Support** or the chat button at bottom right
2. Ask a question like "What is web development?"
3. Verify bot responds

### Test Mental Health Chat:
1. Open chat window
2. Click **MindCare** tab
3. Ask a question about mental health
4. Bot should provide supportive response

### Test Skills/Studies:
1. Navigate to **Studies** or **Skills** sections
2. Click on a subject/skill
3. View books and videos
4. Try filtering by class/course

---

## 📁 Project Structure

```
eduHub/
├── backend/
│   ├── server.js          (Main backend server)
│   ├── config.js          (Configuration)
│   ├── firebase-config.js (Firebase setup)
│   └── .env               (Environment variables - CREATE THIS)
├── frontend/
│   ├── index.html         (Main HTML)
│   ├── app.js             (Main JavaScript)
│   ├── styles.css         (All styles)
│   ├── data-manager.js    (Data storage/API)
│   ├── supabase-config.js (Supabase client config)
│   └── *.html             (Additional pages)
└── Documentation files
```

---

## 🔧 Common Issues & Solutions

### Issue: "Port 3000 already in use"
```bash
# Windows: Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or use different port
PORT=3001 node server.js
```

### Issue: "Cannot find module"
```bash
# This shouldn't happen - server uses built-in modules only
# Check if Node.js is properly installed
node --version
```

### Issue: Supabase storage 400 error
- Check bucket name matches in `.env` and code
- Verify bucket is PUBLIC
- See SUPABASE_SETUP_GUIDE.md troubleshooting section

### Issue: Can't login with Google
- OAuth setup not completed in Supabase
- For now, use admin account or localStorage fallback

### Issue: Chat not responding
- Verify backend is running
- Check GROQ_API_KEY is set in `.env`
- Try refreshing browser
- Check browser console for errors

---

## 🛑 Stopping the Server

Press `Ctrl + C` in the terminal where server is running.

---

## 📝 Useful Commands

```bash
# Start backend server
cd backend
node server.js

# With custom port
PORT=3001 node server.js

# Check if running
# Visit http://localhost:3000 in browser
```

---

## 🌍 Access Application

- **Local**: http://localhost:3000
- **API Status**: http://localhost:3000/api/config-status
- **Chat API**: POST http://localhost:3000/api/chat
- **Books API**: GET http://localhost:3000/api/books

---

## 📚 Documentation Files

1. **SUPABASE_SETUP_GUIDE.md** - Complete Supabase configuration
2. **QUICK_START.md** - This file (quick setup)
3. **README.md** - Project overview

---

## ✅ Verification Checklist

- [ ] Node.js installed (`node --version` works)
- [ ] Backend `.env` file created with all required variables
- [ ] Supabase project created and configured
- [ ] Backend server running without errors
- [ ] Can access http://localhost:3000 in browser
- [ ] Login page displays correctly
- [ ] Can login (admin or demo account)
- [ ] Chat responds to messages
- [ ] Can upload files (if Supabase configured)

---

## 🎓 Next Steps

1. Explore the application features
2. Add your own subjects and skills
3. Upload study materials (PDFs, videos)
4. Customize the design (styles.css)
5. Extend with additional features

---

## 💡 Tips

- **Dark Mode**: Click the theme toggle button (top right)
- **Mobile**: Application is responsive - works on phones/tablets
- **Chat History**: Saved in browser (localStorage)
- **Profile**: Set up your profile for personalized experience
- **Admin Features**: Upload books, manage subjects, manage skills (admin account only)

---

## 🆘 Need Help?

1. Check browser console: F12 → Console tab (for JavaScript errors)
2. Check server terminal: Look for error messages
3. See SUPABASE_SETUP_GUIDE.md troubleshooting section
4. Verify all credentials in `.env` file match Supabase

---

## 🎉 You're Ready!

You now have a fully functional EduHub application running locally. Enjoy exploring and using the platform!

For detailed Supabase configuration, see: `SUPABASE_SETUP_GUIDE.md`
