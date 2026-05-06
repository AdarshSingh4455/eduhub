#!/usr/bin/env node

/**
 * EduHub Configuration Verification Script
 * 
 * This script checks if all required components are properly configured.
 * Run it before starting the application to catch issues early.
 * 
 * Usage: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(description, condition) {
    if (condition) {
        log(`✓ ${description}`, 'green');
        return true;
    } else {
        log(`✗ ${description}`, 'red');
        return false;
    }
}

function warn(message) {
    log(`⚠ ${message}`, 'yellow');
}

function info(message) {
    log(`ℹ ${message}`, 'blue');
}

let allGood = true;

log('\n=== EduHub Configuration Verification ===\n', 'cyan');

// 1. Check Node.js version
log('1. Checking Node.js Installation...', 'cyan');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
allGood &= check(`Node.js ${nodeVersion} installed`, majorVersion >= 16);
if (majorVersion < 16) {
    warn('Node.js 16+ required. Update Node.js from https://nodejs.org/');
}

// 2. Check required directories
log('\n2. Checking Project Structure...', 'cyan');
allGood &= check('Frontend directory exists', fs.existsSync(path.join(__dirname, 'frontend')));
allGood &= check('Backend directory exists', fs.existsSync(path.join(__dirname, 'backend')));

// 3. Check frontend files
log('\n3. Checking Frontend Files...', 'cyan');
allGood &= check('index.html exists', fs.existsSync(path.join(__dirname, 'frontend', 'index.html')));
allGood &= check('app.js exists', fs.existsSync(path.join(__dirname, 'frontend', 'app.js')));
allGood &= check('styles.css exists', fs.existsSync(path.join(__dirname, 'frontend', 'styles.css')));
allGood &= check('data-manager.js exists', fs.existsSync(path.join(__dirname, 'frontend', 'data-manager.js')));
allGood &= check('supabase-config.js exists', fs.existsSync(path.join(__dirname, 'frontend', 'supabase-config.js')));

// 4. Check backend files
log('\n4. Checking Backend Files...', 'cyan');
allGood &= check('server.js exists', fs.existsSync(path.join(__dirname, 'backend', 'server.js')));
allGood &= check('config.js exists', fs.existsSync(path.join(__dirname, 'backend', 'config.js')));

// 5. Check .env file
log('\n5. Checking Backend Configuration (.env)...', 'cyan');
const envPath = path.join(__dirname, 'backend', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
    check('.env file exists', true);
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const envVars = {};
    
    lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
    });
    
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_BUCKET'];
    let envConfigGood = true;
    
    requiredEnvVars.forEach(variable => {
        const exists = envVars[variable] && envVars[variable] !== '';
        const status = check(`  ${variable} set`, exists);
        if (!status) {
            warn(`  → Add ${variable} to backend/.env`);
        }
        envConfigGood &= status;
    });
    
    allGood &= envConfigGood;
    
    // Optional variables
    if (envVars.PORT) {
        info(`  PORT configured: ${envVars.PORT}`);
    }
    if (envVars.GROQ_API_KEY) {
        info(`  GROQ_API_KEY configured (chat enabled)`);
    } else {
        warn(`  GROQ_API_KEY not set (chat will use fallback responses)`);
    }
} else {
    allGood = false;
    check('.env file exists', false);
    log('\n   Please create backend/.env with:', 'yellow');
    log(`
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   SUPABASE_BUCKET=books
   GROQ_API_KEY=your_groq_key (optional)
   `, 'yellow');
}

// 6. Check Supabase config in frontend
log('\n6. Checking Frontend Supabase Configuration...', 'cyan');
const supabaseConfigPath = path.join(__dirname, 'frontend', 'supabase-config.js');
const supabaseContent = fs.readFileSync(supabaseConfigPath, 'utf8');

const hasSupabaseUrl = supabaseContent.includes('const SUPABASE_URL');
const hasSupabaseKey = supabaseContent.includes('const SUPABASE_ANON_KEY');
const hasBucket = supabaseContent.includes('const SUPABASE_BUCKET');

check('SUPABASE_URL defined', hasSupabaseUrl);
check('SUPABASE_ANON_KEY defined', hasSupabaseKey);
check('SUPABASE_BUCKET defined', hasBucket);

if (!hasSupabaseUrl || !hasSupabaseKey || !hasBucket) {
    warn('Update frontend/supabase-config.js with your Supabase credentials');
    allGood = false;
}

// 7. Check documentation
log('\n7. Checking Documentation...', 'cyan');
check('SUPABASE_SETUP_GUIDE.md exists', fs.existsSync(path.join(__dirname, 'SUPABASE_SETUP_GUIDE.md')));
check('QUICK_START_LOCAL.md exists', fs.existsSync(path.join(__dirname, 'QUICK_START_LOCAL.md')));
check('FIXES_AND_CONFIGURATION_SUMMARY.md exists', fs.existsSync(path.join(__dirname, 'FIXES_AND_CONFIGURATION_SUMMARY.md')));

// 8. Summary
log('\n=== Verification Summary ===\n', 'cyan');

if (allGood) {
    log('✓ All checks passed! You are ready to start the application.', 'green');
    log('\nTo start the backend server, run:', 'cyan');
    log('  cd backend && node server.js', 'blue');
    log('\nThen open in browser:', 'cyan');
    log('  http://localhost:3000', 'blue');
    process.exit(0);
} else {
    log('✗ Some checks failed. Please fix the issues above before starting.', 'red');
    log('\nCommon issues:', 'yellow');
    log('  1. Missing backend/.env file - see setup guide', 'yellow');
    log('  2. Supabase credentials not configured', 'yellow');
    log('  3. Required Node.js version not installed', 'yellow');
    log('\nFor detailed setup instructions, see:', 'cyan');
    log('  - SUPABASE_SETUP_GUIDE.md (Supabase configuration)', 'blue');
    log('  - QUICK_START_LOCAL.md (Local development setup)', 'blue');
    log('  - FIXES_AND_CONFIGURATION_SUMMARY.md (All fixes applied)', 'blue');
    process.exit(1);
}
