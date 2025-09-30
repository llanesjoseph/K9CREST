// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file is used for server-side operations only.

/**
 * Safely parse Firebase private key from environment variable
 * Handles multiple encoding formats from different platforms (Vercel, local, etc.)
 */
function parsePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  // Handle escaped newlines (\\n) - common when pasted as string
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }

  // Key already has proper newlines or is in correct format
  return key;
}

/**
 * Initialize Firebase Admin with proper credentials
 */
function initializeFirebaseAdmin(): App {
  const apps = getApps();

  if (apps.length > 0) {
    return getApp();
  }

  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                    process.env.FIREBASE_PROJECT_ID ||
                    process.env.GOOGLE_CLOUD_PROJECT ||
                    'k9-trials-tracker';

  // If credentials are available, use them
  if (privateKey && clientEmail) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    } catch (error: any) {
      console.error('Failed to initialize Firebase Admin with credentials:', error.message);
      // Fall back to default initialization
      return initializeApp({ projectId });
    }
  }

  // Fallback: initialize without explicit credentials (uses default application credentials)
  console.warn('Firebase Admin: No explicit credentials found, using default initialization');
  return initializeApp({ projectId });
}

const app = initializeFirebaseAdmin();
const adminDb = getFirestore(app);

export { adminDb, app as firebaseAdmin };
