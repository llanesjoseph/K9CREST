#!/usr/bin/env node

// AGGRESSIVE ADMIN SETTER SCRIPT
// This will forcefully set joseph@crucibleanalytics.dev as admin

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Check for required environment variables
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.log('❌ Missing Firebase credentials in environment variables');
  console.log('Make sure FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL are set');
  process.exit(1);
}

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: "k9-trials-tracker",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function setAdmin() {
  const targetEmail = 'joseph@crucibleanalytics.dev';

  try {
    console.log('🚀 Starting aggressive admin setup...');

    // Get user by email
    console.log(`📧 Looking up user: ${targetEmail}`);
    const userRecord = await getAuth().getUserByEmail(targetEmail);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Set admin claims
    console.log('🔐 Setting admin custom claims...');
    await getAuth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('✅ Admin claims set successfully');

    // Set in Firestore
    console.log('💾 Updating Firestore user document...');
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set({
      email: targetEmail,
      role: 'admin',
      updatedAt: new Date().toISOString(),
      forceSet: true,
      setBy: 'admin-script'
    }, { merge: true });
    console.log('✅ Firestore document updated');

    console.log('');
    console.log('🎉 SUCCESS! joseph@crucibleanalytics.dev is now admin');
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to your app and sign in as joseph@crucibleanalytics.dev');
    console.log('2. You should immediately have admin access');
    console.log('3. You should see the role switcher bar');
    console.log('4. You can now create events and manage the system');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting admin:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('');
      console.log('💡 User not found. Make sure:');
      console.log('1. joseph@crucibleanalytics.dev has signed in to the app at least once');
      console.log('2. The email is correct');
      console.log('');
    }

    process.exit(1);
  }
}

// Run the script
setAdmin().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error.message);
  process.exit(1);
});