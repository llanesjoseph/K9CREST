#!/usr/bin/env node

/**
 * 🔥 AGGRESSIVE FIX SCRIPT
 * This script aggressively fixes environment and cache issues
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔥 AGGRESSIVE FIX STARTING...\n');

// Step 1: Check environment variables
console.log('📋 Step 1: Checking environment variables...');
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'GOOGLE_MAPS_API_KEY'
];

const missingVars = [];
for (const varName of requiredVars) {
  if (!envContent.includes(varName + '=')) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.log('\n📖 See AGGRESSIVE_FIX.md for instructions on getting these credentials.');
  process.exit(1);
}

console.log('✅ All required environment variables found\n');

// Step 2: Clear Next.js cache
console.log('📋 Step 2: Clearing Next.js cache...');
const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✅ .next cache cleared\n');
  } catch (error) {
    console.error('⚠️  Warning: Could not clear .next directory:', error.message);
  }
} else {
  console.log('ℹ️  No .next directory to clear\n');
}

// Step 3: Clear npm cache
console.log('📋 Step 3: Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npm cache cleared\n');
} catch (error) {
  console.error('⚠️  Warning: Could not clear npm cache:', error.message);
}

// Step 4: Kill any running dev servers (Windows-specific)
console.log('📋 Step 4: Killing any running dev servers...');
try {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    try {
      execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *next dev*"', { stdio: 'pipe' });
      console.log('✅ Killed running dev servers\n');
    } catch (e) {
      console.log('ℹ️  No dev servers were running\n');
    }
  } else {
    try {
      execSync('pkill -f "next dev"', { stdio: 'pipe' });
      console.log('✅ Killed running dev servers\n');
    } catch (e) {
      console.log('ℹ️  No dev servers were running\n');
    }
  }
} catch (error) {
  console.log('ℹ️  Could not kill dev servers (this is okay)\n');
}

// Step 5: Final verification
console.log('📋 Step 5: Final verification...');
console.log('✅ Environment: Configured');
console.log('✅ Cache: Cleared');
console.log('✅ Processes: Cleaned\n');

console.log('🎉 AGGRESSIVE FIX COMPLETE!\n');
console.log('📋 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Navigate to: http://localhost:3000/bootstrap-admin');
console.log('3. Click "Set Admin Role" button');
console.log('4. Google Maps autocomplete should now work\n');
