import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Override isBuild to false manually so firebase-admin initializes correctly
process.env.npm_lifecycle_event = "";
process.env.NEXT_PHASE = "";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  let cert = process.env.FIREBASE_PRIVATE_KEY;
  if (cert) {
    cert = cert.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: cert
    }),
  });
}

const db = admin.firestore();

async function main() {
  const users = await db.collection("users").get();
  console.log(`Total users in 'users' collection: ${users.size}`);
  
  users.forEach((doc: any) => {
    console.log(`[UID: ${doc.id}] Email: ${doc.data().email}, Role: ${doc.data().role}, CompanyId: ${doc.data().companyId}`);
  });
}
main().catch(console.error);
