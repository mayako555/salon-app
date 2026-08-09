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
  
  // Try fallback to local emulator or application default credentials if no key
  try {
    if (cert) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: cert
        }),
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error("Init error", e);
  }
}

const db = admin.firestore();

async function main() {
  const staff = await db.collection("staff_profiles").get();
  console.log("Found staff:", staff.size);
  
  for (const doc of staff.docs) {
    const data = doc.data();
    if (data.uid) {
      console.log(`Setting users/${data.uid} for ${data.name}...`);
      await db.collection("users").doc(data.uid).set({
        role: data.role,
        companyId: data.companyId,
        email: data.email,
      }, { merge: true });
    } else {
        // If they don't have a uid but they have an email, we could try to look them up in Auth
        console.log(`No uid for ${data.name} (${data.email})`);
    }
  }
  console.log("Done syncing users!");
}
main().catch(console.error);
