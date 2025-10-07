#!/usr/bin/env node

/**
 * 🚨 EMERGENCY ADMIN SETTER
 * Directly sets admin role in Firebase for specified email
 * Bypasses all authentication checks
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'k9-trials-tracker',
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function setAdminRole(email) {
  try {
    console.log(`🔥 EMERGENCY ADMIN OVERRIDE ACTIVATED: Force setting ${email} as admin\n`);

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.email} (UID: ${userRecord.uid})`);

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('✅ Custom claims set: { role: "admin" }');

    // Set in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      role: 'admin',
      updatedAt: new Date().toISOString(),
      emergencyOverride: true,
    }, { merge: true });
    console.log('✅ Firestore user document updated');

    console.log(`\n🎉 SUCCESS! ${email} is now an admin`);
    console.log('\n📋 Next steps:');
    console.log('1. Sign out of the application');
    console.log('2. Sign back in');
    console.log('3. You should now see the admin UI');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 The user needs to sign up first:');
      console.log('1. Go to http://localhost:3004');
      console.log('2. Sign up with this email');
      console.log('3. Run this script again');
    }
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'joseph@crucibleanalytics.dev';

setAdminRole(email);
