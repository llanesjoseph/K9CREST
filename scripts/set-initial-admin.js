const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Check for required environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these in your .env.local file or environment.');
  console.error('\nAlternatively, you can set the admin role manually:');
  console.error('1. Log in as joseph@crucibleanalytics.dev');
  console.error('2. Go to Firebase Console > Authentication > Users');
  console.error('3. Click on the user and set custom claims: {"role": "admin"}');
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const auth = getAuth();
const db = getFirestore();

async function setInitialAdmin() {
  try {
    const adminEmail = 'joseph@crucibleanalytics.dev';

    // Get user by email
    const userRecord = await auth.getUserByEmail(adminEmail);
    console.log(`Found user: ${userRecord.email} (UID: ${userRecord.uid})`);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('✅ Set custom claims to admin');

    // Also set in Firestore for backup
    await db.collection('users').doc(userRecord.uid).set({
      email: adminEmail,
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Updated Firestore user document');

    console.log(`🎉 Successfully set ${adminEmail} as admin!`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User ${adminEmail} not found. Please make sure they have logged in at least once.`);
    } else {
      console.error('❌ Error setting admin role:', error.message);
    }
  }
}

setInitialAdmin().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});