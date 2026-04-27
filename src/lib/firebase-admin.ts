import * as admin from "firebase-admin";
// Build fix trigger

// Defensive config parsing
const getPrivateKey = () => {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return null;
  return key.replace(/\\n/g, "\n").replace(/\"/g, "").trim();
};

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: getPrivateKey(),
};

function initAdmin() {
  // Already initialized
  if (admin.apps.length) return admin.app();

  // Strict check: only initialize if we have BOTH email and a valid-looking key
  const pk = firebaseAdminConfig.privateKey;
  const hasValidKey = pk && pk.includes("-----BEGIN PRIVATE KEY-----");

  if (firebaseAdminConfig.clientEmail && hasValidKey) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
      });
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
      return null;
    }
  }
  
  // If we are here, we are likely in a build environment or missing env vars.
  // DO NOT call admin.initializeApp() with no arguments, as it may trigger 
  // searches for default credentials that crash in certain environments.
  return null;
}

/**
 * Proxy factory to create safe, lazy-loaded Firebase Admin services.
 * If the app cannot be initialized (e.g., during build), it returns a Proxy 
 * that swallows calls or returns undefined, preventing crashes.
 */
function createSafeProxy<T extends object>(getService: (app: admin.app.App) => T): T {
  return new Proxy({} as T, {
    get: (target, prop) => {
      const app = initAdmin();
      if (!app) {
        // Return a no-op function if a method is called, or undefined for properties
        return (...args: any[]) => {
          console.warn(`Firebase Admin service called during build or missing config: ${String(prop)}`);
          return Promise.resolve({ docs: [], exists: false, success: false }); 
        };
      }
      const service = getService(app);
      const value = (service as any)[prop];
      if (typeof value === 'function') {
        return value.bind(service);
      }
      return value;
    }
  });
}

export const adminAuth = createSafeProxy((app) => app.auth());
export const adminDb = createSafeProxy((app) => app.firestore());
