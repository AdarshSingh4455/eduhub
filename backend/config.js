const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');

    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
            return;
        }

        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();

        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
}

loadEnvFile();

module.exports = {
    port: Number(process.env.PORT || 3000),
    groqApiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'books'
};
