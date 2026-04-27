import * as admin from "firebase-admin";

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").replace(/\"/g, "").trim(),
};

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const pk = firebaseAdminConfig.privateKey;
  const hasValidKey = pk && pk.includes("-----BEGIN PRIVATE KEY-----");

  if (firebaseAdminConfig.clientEmail && hasValidKey) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
      });
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
    }
  }
  
  // Fallback for build time or development
  if (!admin.apps.length) {
    try {
      return admin.initializeApp();
    } catch (e) {
      return null;
    }
  }
  return admin.app();
}

// Proxy-like access to avoid crashes during build time
export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get: (target, prop) => {
    const app = initAdmin();
    if (!app) return undefined;
    return (app.auth() as any)[prop];
  }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get: (target, prop) => {
    const app = initAdmin();
    if (!app) return undefined;
    return (app.firestore() as any)[prop];
  }
});
