// ===== EDUHUB CONFIGURATION GUIDE =====
// Copy and follow these instructions to setup your platform

// ===== 1. SUPABASE SETUP =====
// File: script.js (lines ~14-16)

/*
STEP 1: Go to https://supabase.com and create account
STEP 2: Create new project
STEP 3: Go to Project Settings → API
STEP 4: Copy the values below and replace in script.js

Replace this line:
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

With your actual values:
    const SUPABASE_URL = 'https://your-project.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

Then uncomment the initialization code:
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
*/

// ===== 2. GROQ API SETUP (Saarthi Chatbot) =====
// File: script.js (line ~458)

/*
STEP 1: Go to https://console.groq.com
STEP 2: Sign up / Log in
STEP 3: Create API key
STEP 4: Copy your API key
STEP 5: Replace this line in script.js:
    const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

With your actual key:
    const GROQ_API_KEY = 'gsk_wFa...';

STEP 6: Uncomment and complete the callGroqAPI function:

async function callGroqAPI(prompt) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Saarthi, an AI study companion. Provide responses in this format: Definition, 3 key points, and advantages/disadvantages when asked.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
    }
}
*/

// ===== 3. GOOGLE OAUTH SETUP =====
// File: script.js (lines ~95-105)

/*
STEP 1: Go to https://console.cloud.google.com
STEP 2: Create new project
STEP 3: Enable Google+ API
STEP 4: Create OAuth 2.0 credentials (Web application)
STEP 5: Add authorized redirect URI:
    http://localhost:3000/auth/callback  (for local)
    https://yourdomain.com/auth/callback (for production)
STEP 6: Copy Client ID
STEP 7: Replace the googleLogin function:

function googleLogin() {
    // Use Supabase Google provider
    supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    }).then(({ data, error }) => {
        if (error) {
            showToast(error.message, 'error');
        } else {
            // User will be redirected after auth
        }
    });
}
*/

// ===== 4. SUPABASE STORAGE SETUP (PDF Upload) =====
// File: script.js (lines ~378-403)

/*
STEP 1: Go to Supabase dashboard
STEP 2: Click "Storage" in left menu
STEP 3: Create new bucket named "eduhub-books"
STEP 4: Make it public
STEP 5: Replace uploadBook function:

async function uploadBook() {
    const title = document.getElementById('bookTitle').value.trim();
    const file = document.getElementById('bookFile').files[0];
    
    if (!title || !file) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loader"></span> Uploading...';
    btn.disabled = true;
    
    try {
        // Upload to Supabase Storage
        const fileName = `${currentSubject}/${Date.now()}-${file.name}`;
        const { data, error } = await supabaseClient.storage
            .from('eduhub-books')
            .upload(fileName, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from('eduhub-books')
            .getPublicUrl(fileName);
        
        // Save to database
        const { error: dbError } = await supabaseClient
            .from('resources')
            .insert({
                category_id: currentSubject,
                type: 'book',
                title: title,
                file_url: urlData.publicUrl
            });
        
        if (dbError) throw dbError;
        
        showToast('Book uploaded successfully!', 'success');
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookFile').value = '';
        document.getElementById('uploadBookForm').classList.add('hidden');
        loadBooks(currentSubject);
        
        btn.textContent = originalText;
        btn.disabled = false;
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
*/

// ===== 5. ENVIRONMENT VARIABLES (Optional but Recommended) =====
// Create file: .env

/*
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GROQ_API_KEY=your-groq-key-here
GOOGLE_CLIENT_ID=your-google-client-id

Then load in script.js:
const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
    groqKey: process.env.GROQ_API_KEY,
    googleClientId: process.env.GOOGLE_CLIENT_ID
};
*/

// ===== 6. TESTING CHECKLIST =====
/*
ADMIN LOGIN TEST:
1. Email: admin@eduhub.com
2. Password: admin123
3. Verify "Add More" buttons appear
4. Test PDF upload
5. Test video link addition
6. Test edit/delete buttons

STUDENT LOGIN TEST:
1. Click "Register" tab
2. Enter email and password
3. Click "Create Account"
4. Verify you cannot see admin tools
5. Verify download/view buttons work
6. Test navigation

CHATBOT TEST:
1. Click chat button
2. Ask "What is web development"
3. Verify response format (definition + 3 points)
4. Test with other topics

RESPONSIVE TEST:
1. Resize browser to 480px width
2. Verify sidebar becomes mobile menu
3. Test touch/click interactions
4. Verify text is readable
*/

// ===== 7. DEPLOYMENT CHECKLIST =====
/*
BEFORE DEPLOYING:
[ ] Replace all "YOUR_" placeholders with actual values
[ ] Test all features locally first
[ ] Setup database tables on Supabase
[ ] Enable Row Level Security policies
[ ] Setup storage bucket with correct permissions
[ ] Test Groq API connection
[ ] Test Google OAuth flow
[ ] Remove console.log statements (optional)
[ ] Test on mobile devices
[ ] Verify all images load correctly

DEPLOYMENT PLATFORMS:
Option 1: Netlify
- Connect GitHub repo
- Set environment variables in Netlify dashboard
- Auto-deploy on push

Option 2: Vercel
- Similar to Netlify
- Great for Next.js projects
- Good performance

Option 3: Firebase Hosting
- Deploy command: firebase deploy
- Free SSL certificate
- Good for static sites

Option 4: GitHub Pages
- Perfect for static sites
- Free custom domain
- Simple deployment
*/

// ===== 8. SECURITY BEST PRACTICES =====
/*
1. NEVER commit API keys to Git
   - Use .env files
   - Use platform secrets (Netlify, Vercel, etc.)

2. Use environment variables:
   const apiKey = process.env.GROQ_API_KEY || 'fallback-key';

3. Setup Supabase RLS policies:
   - Restrict student access to their own data
   - Allow admins to manage all resources
   - Public read access for study materials

4. Validate file uploads:
   - Check file type (PDF only)
   - Check file size limit
   - Scan for malware

5. Rate limit API calls:
   - Prevent spam
   - Protect API quota

6. HTTPS only:
   - All communications encrypted
   - Secure cookies
   - HSTS headers
*/

// ===== 9. TROUBLESHOOTING GUIDE =====
/*
ISSUE: Auth modal won't close
FIX: Check if currentUser is null
    - Open DevTools (F12)
    - Type: console.log(currentUser)
    - Should show user object after login

ISSUE: Chat not responding
FIX: Verify API key
    - Check Groq API key is correct
    - Verify API key has permissions
    - Check browser console for errors

ISSUE: PDF upload fails
FIX: Check Supabase setup
    - Verify bucket exists and is public
    - Check file size limits
    - Verify auth permissions

ISSUE: Styles not loading
FIX: Clear cache and reload
    - Ctrl+Shift+Delete (Windows)
    - Cmd+Shift+Delete (Mac)
    - Hard refresh: Ctrl+Shift+R

ISSUE: Google OAuth not working
FIX: Verify OAuth setup
    - Check Client ID is correct
    - Verify redirect URI matches
    - Check Google Console for errors
*/

// ===== 10. USEFUL LINKS =====
/*
Supabase Docs: https://supabase.com/docs
Groq API: https://console.groq.com/docs
Google OAuth: https://developers.google.com/identity/protocols/oauth2
Netlify Deploy: https://netlify.com/
Vercel Deploy: https://vercel.com/
MDN Web Docs: https://developer.mozilla.org/
*/
