import { initializeApp, getApps, getApp } from "firebase/app";
import { Firestore, initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { requireFirebaseEnv } from "./firebase-config";

const firebaseConfig = {
  apiKey: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: requireFirebaseEnv("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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
