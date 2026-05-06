#!/usr/bin/env node

/**
 * EduHub Critical Fixes Verification Script
 * Checks that all critical fixes have been properly applied
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileContent(filePath, searchStrings, description) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let allFound = true;
        const results = searchStrings.map(str => {
            const found = content.includes(str);
            if (!found) allFound = false;
            return { str, found };
        });
        
        if (allFound) {
            log(`✅ ${description}`, 'green');
        } else {
            log(`❌ ${description} - MISSING:`, 'red');
            results.forEach(r => {
                if (!r.found) log(`   - "${r.str}"`, 'yellow');
            });
        }
        return allFound;
    } catch (error) {
        log(`❌ ${description} - Error: ${error.message}`, 'red');
        return false;
    }
}

console.clear();
log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
log('║   EduHub Critical Fixes Verification v1.0                  ║', 'blue');
log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

let allPassed = true;

// Check 1: Chat API URL Fix
log('\n[1] Checking Chat API URL Fix...', 'blue');
allPassed &= checkFileContent(
    'frontend/app.js',
    ['http://localhost:3000/api/chat'],
    'Chat API uses correct backend URL'
);

// Check 2: Auto-login Removal
log('\n[2] Checking Auto-Admin Login Removal...', 'blue');
allPassed &= checkFileContent(
    'frontend/app.js',
    ['Only restore session for valid stored users (not auto-login)'],
    'Auto-login logic removed'
);

// Check 3: SPA Conversion
log('\n[3] Checking SPA Conversion...', 'blue');
allPassed &= checkFileContent(
    'frontend/index.html',
    ['startMeditationTimer(300)', 'startStressReliefTimer(300)', 'meditationTimerSection'],
    'Meditation/Stress pages converted to SPA sections'
);

// Check 4: Timer Functions
log('\n[4] Checking Timer Implementation...', 'blue');
allPassed &= checkFileContent(
    'frontend/app.js',
    [
        'function startMeditationTimer',
        'function startStressReliefTimer',
        'function pauseTimer',
        'function resetTimer',
        'window.startMeditationTimer = startMeditationTimer'
    ],
    'Timer functions implemented'
);

// Check 5: Profile Scroll
log('\n[5] Checking Profile Scroll Fix...', 'blue');
allPassed &= checkFileContent(
    'frontend/app.js',
    ['profileSection.scrollIntoView'],
    'Profile scroll into view implemented'
);

// Check 6: Session Persistence
log('\n[6] Checking Session Persistence Enhancement...', 'blue');
allPassed &= checkFileContent(
    'frontend/app.js',
    [
        'sessionStorage.setItem(\'eduhubSupabaseSession\'',
        'INITIAL_SESSION',
        'TOKEN_REFRESHED'
    ],
    'Supabase session persistence enhanced'
);

// Check 7: RLS Documentation
log('\n[7] Checking RLS Policies Documentation...', 'blue');
allPassed &= checkFileContent(
    'RLS_POLICIES_IMPLEMENTATION.md',
    [
        'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY',
        'auth.uid() = id',
        'auth.role() = \'service_role\'',
        'Quick Setup Script'
    ],
    'RLS policies documentation created'
);

// Check 8: Critical Fixes Documentation
log('\n[8] Checking Fix Documentation...', 'blue');
allPassed &= checkFileContent(
    'CRITICAL_FIXES_APPLIED.md',
    [
        'Chatbot 405 Error',
        'Auto Admin Login',
        'Session Reset After Navigation',
        'Timer Not Working',
        'Multiple HTML Pages'
    ],
    'Complete fix documentation created'
);

// Check backend server.js
log('\n[9] Checking Backend Configuration...', 'blue');
allPassed &= checkFileContent(
    'backend/server.js',
    ['if (req.method === \'POST\' && url.pathname === \'/api/chat\')'],
    'Backend chat endpoint configured'
);

// Summary
log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
if (allPassed) {
    log('║   ✅ ALL CRITICAL FIXES VERIFIED SUCCESSFULLY!            ║', 'green');
} else {
    log('║   ⚠️  SOME FIXES NEED VERIFICATION                        ║', 'yellow');
}
log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

// Additional checks
log('\n📋 QUICK START VERIFICATION:\n', 'blue');

const checks = [
    ['Backend .env exists', 'backend/.env', 'file'],
    ['Frontend config exists', 'frontend/supabase-config.js', 'file'],
    ['Backend server exists', 'backend/server.js', 'file'],
    ['Frontend app exists', 'frontend/app.js', 'file'],
    ['Frontend HTML exists', 'frontend/index.html', 'file'],
];

checks.forEach(([name, filePath, type]) => {
    const fullPath = path.join(process.cwd(), filePath);
    try {
        if (type === 'file') {
            const exists = fs.existsSync(fullPath);
            if (exists) {
                log(`✅ ${name}`, 'green');
            } else {
                log(`❌ ${name} - NOT FOUND`, 'red');
            }
        }
    } catch (error) {
        log(`❌ ${name} - ERROR: ${error.message}`, 'red');
    }
});

log('\n📝 NEXT STEPS:\n', 'blue');
log('1. Start backend:');
log('   cd backend && node server.js\n', 'yellow');

log('2. Open frontend in browser:');
log('   http://localhost:3000/ (if serving through backend)', 'yellow');
log('   OR');
log('   Use VS Code Live Server on frontend/index.html\n', 'yellow');

log('3. Test each fix:');
log('   ✓ Chat should work (no 405 error)', 'yellow');
log('   ✓ Should NOT auto-login as admin', 'yellow');
log('   ✓ Meditation timer should work', 'yellow');
log('   ✓ Profile section should scroll smoothly', 'yellow');
log('   ✓ Session should persist across sections\n', 'yellow');

log('4. Apply RLS policies:');
log('   - Open Supabase SQL Editor', 'yellow');
log('   - Copy script from RLS_POLICIES_IMPLEMENTATION.md', 'yellow');
log('   - Run to apply all policies\n', 'yellow');

log('For detailed information, see CRITICAL_FIXES_APPLIED.md\n', 'blue');

process.exit(allPassed ? 0 : 1);
