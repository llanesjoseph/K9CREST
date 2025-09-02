// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file is used for server-side operations only.

const apps = getApps();

const app = !apps.length
  ? initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
  : getApp();

const adminDb = getFirestore(app);

export { adminDb };
