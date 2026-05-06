// Supabase frontend config for EduHub.
// Update these values with your Supabase project details.
// Do not commit real keys to source control.

const SUPABASE_URL = 'https://miyickamkkydypncdgjg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peWlja2Fta2t5ZHlwbmNkZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTUyMTEsImV4cCI6MjA5MjY5MTIxMX0.mjmgzb_cVYWEK3dAIT1qX042rOQmevGSYjEUN-dSHcY';
const SUPABASE_BUCKET = 'books';

window.SUPABASE_BUCKET = SUPABASE_BUCKET;
window.eduhubSupabase = null;
window.eduhubSupabaseEnabled = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== 'undefined') {
    window.eduhubSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        }
    });
    window.eduhubSupabaseEnabled = true;
}

function getSupabasePublicUrl(path) {
    if (!window.eduhubSupabaseEnabled || !path) return '';
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURIComponent(path)}`;
    return url;
}
