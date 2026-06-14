// Firebase Admin Initialization (Safe for Vercel Build)
// Build fix trigger

// Build phase detection
const isBuild = process.env.npm_lifecycle_event === "build" || 
                process.env.NEXT_PHASE === "phase-production-build" ||
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
      // Vercelなどで環境変数として設定する場合、改行コードがエスケープされたり
      // 意図しない空白が混入することがあるため、それを適切に処理する
      const key = process.env.FIREBASE_PRIVATE_KEY;
      if (!key) return null;
      
      let parsedKey = key;
      if (key.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          if (parsed.private_key) parsedKey = parsed.private_key;
        } catch (e) {}
      }
      
      // 先頭・末尾のクォーテーションやリテラルの\nを実際の改行に変換
      parsedKey = parsedKey.replace(/\\n/g, "\n").replace(/\"/g, "").trim();
      
      // base64のペイロード部分に意図せず空白やバックスラッシュ(\)が混入した場合、
      // PEMフォーマットエラー(Invalid PEM formatted message)になるため、
      // Base64として有効な文字以外をすべて除去し、64文字ごとに再フォーマットする
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      if (parsedKey.includes(header) && parsedKey.includes(footer)) {
        const payloadStart = parsedKey.indexOf(header) + header.length;
        const payloadEnd = parsedKey.indexOf(footer);
        const payload = parsedKey.substring(payloadStart, payloadEnd);
        
        // Base64として有効な文字 (A-Z, a-z, 0-9, +, /, =) 以外をすべて削除
        const cleanedPayload = payload.replace(/[^A-Za-z0-9+/=]/g, "");
        
        // 64文字ごとに改行を挿入して再構築
        const wrappedPayload = cleanedPayload.match(/.{1,64}/g)?.join("\n") || cleanedPayload;
        parsedKey = header + "\n" + wrappedPayload + "\n" + footer;
      }
      
      return parsedKey;
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
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "salonapp-ee4d2.firebasestorage.app";
      
      if (firebaseAdminConfig.clientEmail && hasValidKey) {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseAdminConfig),
          storageBucket: storageBucket
        });
      } else {
        admin.initializeApp({
          storageBucket: storageBucket
        });
      }
    }

    adminAuth = admin.auth();
    const { getFirestore } = require("firebase-admin/firestore");
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";
    adminDb = getFirestore(admin.app(), databaseId);
    adminStorage = admin.storage();
  }
} catch (error) {
  console.error("CRITICAL: Firebase Admin failed to load:", error);
  adminAuth = createDummyProxy();
  adminDb = createDummyProxy();
  adminStorage = createDummyProxy();
}

export { adminAuth, adminDb, adminStorage };
