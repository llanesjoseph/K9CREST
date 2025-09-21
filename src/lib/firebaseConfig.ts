export const firebaseConfig = {
  apiKey: "AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M",
  authDomain: "k9-trials-tracker.firebaseapp.com",
  projectId: "k9-trials-tracker",
  storageBucket: "k9-trials-tracker.firebasestorage.app",
  messagingSenderId: "174322418803",
  appId: "1:174322418803:web:8b556b1f6f3d3dc45dd606",
  measurementId: "G-SS5GVZNWBQ",
};

export const isFirebaseConfigured = () =>
  Object.values(firebaseConfig).every((v) => typeof v === "string" && v.length > 0);
