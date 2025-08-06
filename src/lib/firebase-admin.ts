// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file is used for server-side operations only.

const apps = getApps();

const app = !apps.length
  ? initializeApp({
      // The GOOGLE_APPLICATION_CREDENTIALS environment variable will be automatically
      // used by the Firebase Admin SDK on App Hosting.
    })
  : getApp();

const adminDb = getFirestore(app);

export { adminDb };
