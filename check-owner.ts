import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
process.env.npm_lifecycle_event = "";
process.env.NEXT_PHASE = "";
const admin = require("firebase-admin");
if (!admin.apps.length) {
  let cert = process.env.FIREBASE_PRIVATE_KEY;
  if (cert) cert = cert.replace(/\\n/g, '\n').replace(/"/g, '').trim();
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
  const uid = "QAAB6p98oJTac5rBfzRzHEwT8h23";
  const doc = await db.collection("users").doc(uid).get();
  console.log("User data:", doc.data());
}
main().catch(console.error);
