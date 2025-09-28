#!/usr/bin/env node

/**
 * Admin Setup Script for joseph@crucibleanalytics.dev
 * This script helps set up admin access for the designated admin user.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Error: Firebase Admin SDK credentials not found in environment variables.');
  console.log('Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL in your .env.local file');
  process.exit(1);
}

try {
  initializeApp({
    credential: cert({
      projectId: "k9-trials-tracker",
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

async function setAdminRole() {
  const targetEmail = 'joseph@crucibleanalytics.dev';
  
  try {
    // Get user by email
    const userRecord = await getAuth().getUserByEmail(targetEmail);
    console.log(`✅ Found user: ${userRecord.email} (UID: ${userRecord.uid})`);
    
    // Set admin role in Firebase Auth
    await getAuth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('✅ Admin role set in Firebase Auth');
    
    // Set admin role in Firestore
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set({
      email: targetEmail,
      role: 'admin',
      updatedAt: new Date().toISOString(),
      displayName: userRecord.displayName || 'Admin User',
      photoURL: userRecord.photoURL || null,
    }, { merge: true });
    console.log('✅ Admin role set in Firestore');
    
    console.log('\n🎉 SUCCESS: joseph@crucibleanalytics.dev is now an admin!');
    console.log('📋 Next steps:');
    console.log('1. Log out and log back in to refresh your authentication token');
    console.log('2. You should now see all admin features in the dashboard');
    console.log('3. You can create events, manage users, and access all creation items');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User ${targetEmail} not found. Please make sure the user has signed up first.`);
    } else {
      console.error('❌ Error setting admin role:', error.message);
    }
    process.exit(1);
  }
}

// Run the admin setup
setAdminRole();