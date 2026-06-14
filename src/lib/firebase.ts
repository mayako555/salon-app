import { initializeApp, getApps, getApp } from "firebase/app";
import { Firestore, initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "salonapp-ee4d2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "380205074998",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PF5G5BNCD5"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";

// Initialize Firestore as a singleton
let db: Firestore;
try {
  db = getFirestore(app, databaseId);
} catch (e) {
  // Pass databaseId as the 3rd argument to initializeFirestore
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, databaseId);
}

const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
