// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

if (!isFirebaseConfigured()) {
  // eslint-disable-next-line no-console
  console.warn(
    "Firebase configuration is incomplete. Update src/lib/firebaseConfig.ts or set the appropriate environment variables."
  );
}

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

let analyticsPromise: Promise<Analytics | undefined> | null = null;
export function getAnalyticsInstance(): Promise<Analytics | undefined> {
  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      if (typeof window === "undefined") return undefined;
      const supported = await isSupported();
      if (!supported) return undefined;
      return getAnalytics(app);
    })();
  }
  return analyticsPromise;
}

export { app, auth, db, storage, googleProvider };
