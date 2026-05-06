const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { port, groqApiKey, supabaseUrl, supabaseAnonKey, supabaseServiceKey, supabaseBucket } = require('./config');

const SUPABASE_URL = supabaseUrl?.replace(/\/$/, '');
const SUPABASE_API_KEY = supabaseServiceKey || supabaseAnonKey;

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

function httpRequest(url, options = {}, payload = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;
        const requestOptions = {
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = transport.request(parsed, requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

async function supabaseRequest(path, method = 'GET', body = null) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY) {
        throw new Error('Supabase configuration is missing');
    }
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
        Accept: 'application/json'
    };
    let payload = null;
    if (body !== null) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }
    const response = await httpRequest(url, { method, headers }, payload);
    const parsed = response.body ? JSON.parse(response.body) : null;
    return { status: response.status, data: parsed };
}

async function supabaseStorageUpload(path, fileType, base64Data) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY) {
        throw new Error('Supabase storage is not configured');
    }
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `${SUPABASE_URL}/storage/v1/object/${supabaseBucket}/${encodedPath}`;
    const buffer = Buffer.from(base64Data, 'base64');
    const headers = {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
        'Content-Type': fileType || 'application/pdf'
    };
    const response = await httpRequest(url, { method: 'PUT', headers }, buffer);
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Storage upload failed with status ${response.status}`);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${supabaseBucket}/${encodedPath}`;
}

async function supabaseStorageDelete(path) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY || !path) return;
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `${SUPABASE_URL}/storage/v1/object/${supabaseBucket}/${encodedPath}`;
    const headers = {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_API_KEY}`
    };
    await httpRequest(url, { method: 'DELETE', headers });
}

async function callGroq(prompt, context = 'study') {
    if (!groqApiKey) return null;

    let systemMessage = 'You are Saarthi, a concise, helpful study companion for EduHub students.';
    if (context === 'mental_health') {
        systemMessage = `You are MindCare AI, a compassionate and supportive mental health companion for EduHub students. Your role is to:\n\n1. Listen actively and empathetically to students' concerns\n2. Provide emotional support and validation\n3. Offer practical coping strategies and stress management techniques\n4. Suggest healthy lifestyle habits and self-care practices\n5. Recommend professional help when appropriate\n6. Maintain confidentiality and create a safe, non-judgmental space\n7. Keep responses warm, understanding, and encouraging\n8. Avoid giving medical diagnoses or prescribing treatments\n9. Focus on general wellness, mindfulness, and positive mental health practices\n10. Be available 24/7 for support and guidance\n\nRemember: You are not a licensed therapist. Always encourage professional help for serious mental health concerns.`;
    }

    const response = await httpRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
        }
    }, JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
        ],
        temperature: 0.4
    }));

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Groq request failed with ${response.status}`);
    }

    const data = JSON.parse(response.body || '{}');
    return data.choices?.[0]?.message?.content || null;
}

function fallbackStudyResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('web development')) {
        return 'Web Development: The process of creating websites and web applications.\n\nKey Points:\n1. Involves frontend, backend, and APIs\n2. Uses HTML, CSS, JavaScript, and server-side tools\n3. Responsive design helps apps work across devices';
    }
    if (lowerPrompt.includes('machine learning')) {
        return 'Machine Learning: A branch of AI where systems learn patterns from data.\n\nKey Points:\n1. Models improve through examples\n2. Common uses include prediction and classification\n3. Good data quality is essential';
    }
    if (lowerPrompt.includes('python')) {
        return 'Python: A readable, versatile programming language.\n\nKey Points:\n1. Popular for automation, data science, and web apps\n2. Has a large library ecosystem\n3. Beginner-friendly syntax makes it great for learning';
    }
    return 'I am here to help with your studies. Ask about a subject, skill, or learning concept and I will explain it clearly with useful key points.';
}

function parseUrl(req) {
    return new URL(req.url, `http://${req.headers.host}`);
}

async function handleApiChat(req, res) {
    try {
        const { message, context } = await readJsonBody(req);
        if (!message || typeof message !== 'string') {
            sendJson(res, 400, { error: 'Message is required.' });
            return;
        }
        const answer = await callGroq(message, context) || fallbackStudyResponse(message);
        sendJson(res, 200, { response: answer });
    } catch (error) {
        console.error('Chat handler error:', error);
        sendJson(res, 200, {
            response: fallbackStudyResponse(''),
            warning: error.message
        });
    }
}

async function handleBookUpload(req, res) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY || !supabaseBucket) {
        sendJson(res, 500, { error: 'Supabase is not configured on the server.' });
        return;
    }
    try {
        const { subjectId, title, class: classLevel, course, fileName, fileType, fileBase64, userId } = await readJsonBody(req);
        if (!subjectId || !title || !fileName || !fileBase64 || !userId) {
            sendJson(res, 400, { error: 'subjectId, title, fileName, fileBase64, and userId are required.' });
            return;
        }
        const safePath = `${userId}/${subjectId}/${Date.now()}_${fileName.replace(/[^\w.\-]+/g, '_')}`;
        const fileUrl = await supabaseStorageUpload(safePath, fileType, fileBase64);
        const payload = {
            subject_id: subjectId,
            title,
            file_url: fileUrl,
            file_path: safePath,
            class: classLevel || '',
            course: course || '',
            user_id: userId,
            created_at: new Date().toISOString()
        };
        const { status, data } = await supabaseRequest('books', 'POST', payload);
        if (status >= 300 || !data) {
            throw new Error('Failed to save book metadata');
        }
        sendJson(res, 200, Array.isArray(data) ? data[0] : data);
    } catch (error) {
        console.error('Book upload error:', error);
        sendJson(res, 500, { error: error.message || 'Unable to upload book' });
    }
}

async function handleGetBooks(req, res) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY) {
        sendJson(res, 500, { error: 'Supabase is not configured on the server.' });
        return;
    }
    try {
        const url = parseUrl(req);
        const subjectId = url.searchParams.get('subjectId');
        const filterType = url.searchParams.get('filterType');
        const filterValue = url.searchParams.get('filterValue');
        const search = url.searchParams.get('search');
        const queryParts = ['select=*', 'order=created_at.desc'];
        if (subjectId) queryParts.push(`subject_id=eq.${subjectId}`);
        if (filterType && filterValue) queryParts.push(`${filterType}=eq.${filterValue}`);
        if (search) {
            const encoded = encodeURIComponent(`*${search}*`);
            queryParts.push(`or=(title.ilike.${encoded},file_url.ilike.${encoded})`);
        }
        const path = `books?${queryParts.join('&')}`;
        const { status, data } = await supabaseRequest(path, 'GET');
        if (status >= 300) {
            throw new Error('Failed to fetch books');
        }
        sendJson(res, 200, data || []);
    } catch (error) {
        console.error('Get books error:', error);
        sendJson(res, 500, { error: error.message || 'Unable to fetch books' });
    }
}

async function handleDeleteBook(req, res, bookId) {
    if (!SUPABASE_URL || !SUPABASE_API_KEY) {
        sendJson(res, 500, { error: 'Supabase is not configured on the server.' });
        return;
    }
    try {
        const { status, data } = await supabaseRequest(`books?select=*&id=eq.${encodeURIComponent(bookId)}`, 'GET');
        if (status >= 300 || !Array.isArray(data) || data.length === 0) {
            sendJson(res, 404, { error: 'Book not found' });
            return;
        }
        const row = data[0];
        if (row.file_path) {
            await supabaseStorageDelete(row.file_path);
        }
        const deleteResponse = await supabaseRequest(`books?id=eq.${encodeURIComponent(bookId)}`, 'DELETE');
        if (deleteResponse.status >= 300) {
            throw new Error('Failed to delete book record');
        }
        sendJson(res, 200, { message: 'Book deleted' });
    } catch (error) {
        console.error('Delete book error:', error);
        sendJson(res, 500, { error: error.message || 'Unable to delete book' });
    }
}

function serveStaticFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            sendJson(res, 404, { error: 'File not found' });
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        sendJson(res, 204, {});
        return;
    }

    const url = parseUrl(req);

    // Serve static files from frontend directory
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
        let filePath = path.join(__dirname, '..', 'frontend', url.pathname === '/' ? 'index.html' : url.pathname);

        // Default to index.html for root path
        if (url.pathname === '/') {
            filePath = path.join(__dirname, '..', 'frontend', 'index.html');
        }

        // Check if file exists
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            let contentType = 'text/plain';
            switch (ext) {
                case '.html': contentType = 'text/html'; break;
                case '.css': contentType = 'text/css'; break;
                case '.js': contentType = 'application/javascript'; break;
                case '.json': contentType = 'application/json'; break;
                case '.png': contentType = 'image/png'; break;
                case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
                case '.gif': contentType = 'image/gif'; break;
                case '.svg': contentType = 'image/svg+xml'; break;
                case '.pdf': contentType = 'application/pdf'; break;
            }
            serveStaticFile(res, filePath, contentType);
            return;
        }
    }

    // API routes...
    if (req.method === 'GET' && url.pathname === '/api/config-status') {
        sendJson(res, 200, { groqConfigured: Boolean(groqApiKey), supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_API_KEY && supabaseBucket) });
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
        await handleApiChat(req, res);
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/books/upload') {
        await handleBookUpload(req, res);
        return;
    }

    if (req.method === 'GET' && url.pathname === '/api/books') {
        await handleGetBooks(req, res);
        return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/books/')) {
        const segments = url.pathname.split('/');
        const bookId = segments[segments.length - 1];
        await handleDeleteBook(req, res, bookId);
        return;
    }

    sendJson(res, 404, { error: 'Not found.' });
});

server.listen(port, () => {
    console.log(`EduHub backend running at http://localhost:${port}`);
});
