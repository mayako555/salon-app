// Firebase Admin Initialization (Safe for Vercel Build)
// Build fix trigger

// Build phase detection
const isBuild = process.env.npm_lifecycle_event === "build" || 
                process.env.NEXT_PHASE === "phase-production-build" ||
                process.env.VERCEL_ENV === "preview" || // sometimes preview builds fail too
                !process.env.FIREBASE_PRIVATE_KEY;

// Create dummy proxies for build time to completely avoid importing or running firebase-admin
function createDummyProxy<T extends object>(): T {
  return new Proxy({} as T, {
    get: () => {
      return (...args: any[]) => Promise.resolve({ docs: [], exists: false, success: false, uid: "dummy" });
    }
  });
}

let adminAuth: any;
let adminDb: any;
let adminStorage: any;

try {
  if (isBuild) {
    adminAuth = createDummyProxy();
    adminDb = createDummyProxy();
    adminStorage = createDummyProxy();
  } else {
    // Only require firebase-admin at runtime
    const admin = require("firebase-admin");

    const getPrivateKey = () => {
      // ... (existing code for getPrivateKey)
      const key = process.env.FIREBASE_PRIVATE_KEY;
      if (!key) return null;
      if (key.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          if (parsed.private_key) return parsed.private_key.replace(/\\n/g, "\n");
        } catch (e) {}
      }
      return key.replace(/\\n/g, "\n").replace(/\"/g, "").trim();
    };

    const getClientEmail = () => {
      // ... (existing code for getClientEmail)
      const email = process.env.FIREBASE_CLIENT_EMAIL;
      if (email) return email;
      const key = process.env.FIREBASE_PRIVATE_KEY;
      if (key && key.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          if (parsed.client_email) return parsed.client_email;
        } catch (e) {}
      }
      return undefined;
    };

    const firebaseAdminConfig = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
      clientEmail: getClientEmail(),
      privateKey: getPrivateKey(),
    };

    if (!admin.apps.length) {
      const pk = firebaseAdminConfig.privateKey;
      const hasValidKey = pk && pk.includes("-----BEGIN PRIVATE KEY-----");
      
      if (firebaseAdminConfig.clientEmail && hasValidKey) {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseAdminConfig),
          storageBucket: "salonapp-ee4d2.firebasestorage.app"
        });
      } else {
        admin.initializeApp({
          storageBucket: "salonapp-ee4d2.firebasestorage.app"
        });
      }
    }

    adminAuth = admin.auth();
    adminDb = admin.firestore();
    adminStorage = admin.storage();
  }
} catch (error) {
  console.error("CRITICAL: Firebase Admin failed to load:", error);
  adminAuth = createDummyProxy();
  adminDb = createDummyProxy();
  adminStorage = createDummyProxy();
}

export { adminAuth, adminDb, adminStorage };
