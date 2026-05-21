import { initializeApp, getApps, getApp } from "firebase/app";
import { Firestore, initializeFirestore, getFirestore } from "@/lib/firestore-server";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
// ... existing config ...
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: "380205074998",
  appId: "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: "G-PF5G5BNCD5"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore as a singleton
let db: Firestore;
try {
  db = getFirestore(app);
} catch (e) {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
}

const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
