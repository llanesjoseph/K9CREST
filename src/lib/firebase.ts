
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "REDACTED",
  authDomain: "k9-trial-scoring-system.firebaseapp.com",
  projectId: "k9-trial-scoring-system",
  storageBucket: "k9-trial-scoring-system.appspot.com",
  messagingSenderId: "54296798485",
  appId: "1:54296798485:web:13a8d2987a0364c6a6e594",
  measurementId: "G-SS5GVZNWBQ"
};

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
