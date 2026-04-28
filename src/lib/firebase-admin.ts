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

// We use require to avoid top-level evaluation if we are in build phase
let adminAuth: any;
let adminDb: any;

try {
  if (isBuild) {
    adminAuth = createDummyProxy();
    adminDb = createDummyProxy();
  } else {
    // Only require firebase-admin at runtime
    const admin = require("firebase-admin");

    const getPrivateKey = () => {
      const key = process.env.FIREBASE_PRIVATE_KEY;
      if (!key) return null;
      
      // If user pasted the entire JSON file contents by mistake
      if (key.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          if (parsed.private_key) {
            return parsed.private_key.replace(/\\n/g, "\n");
          }
        } catch (e) {
          console.error("Failed to parse FIREBASE_PRIVATE_KEY as JSON");
        }
      }
      
      return key.replace(/\\n/g, "\n").replace(/\"/g, "").trim();
    };

    const getClientEmail = () => {
      const email = process.env.FIREBASE_CLIENT_EMAIL;
      if (email) return email;
      
      // Fallback: try to extract from JSON in FIREBASE_PRIVATE_KEY
      const key = process.env.FIREBASE_PRIVATE_KEY;
      if (key && key.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          if (parsed.client_email) {
            return parsed.client_email;
          }
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
          credential: admin.credential.cert(firebaseAdminConfig)
        });
      } else {
        admin.initializeApp();
      }
    }

    adminAuth = admin.auth();
    adminDb = admin.firestore();
  }
} catch (error) {
  console.error("CRITICAL: Firebase Admin failed to load:", error);
  adminAuth = createDummyProxy();
  adminDb = createDummyProxy();
}

export { adminAuth, adminDb };
