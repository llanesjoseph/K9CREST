
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
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

let analytics;
if (typeof window !== "undefined") {
    isSupported().then(yes => {
        if (yes) analytics = getAnalytics(app);
    })
}

export { app, auth, db, storage, analytics, googleProvider };
