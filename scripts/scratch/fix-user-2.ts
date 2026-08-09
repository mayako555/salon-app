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
const auth = admin.auth();

async function main() {
  const staff = await db.collection("staff_profiles").get();
  
  for (const doc of staff.docs) {
    const data = doc.data();
    let uid = data.uid;
    
    if (!uid && data.email) {
      try {
        const userRecord = await auth.getUserByEmail(data.email);
        uid = userRecord.uid;
        console.log(`Found Auth UID for ${data.name}: ${uid}`);
        
        // Update staff_profile to have uid
        await db.collection("staff_profiles").doc(doc.id).update({ uid });
      } catch (e) {
        console.log(`No Auth user for ${data.email}`);
      }
    }
    
    if (uid) {
      await db.collection("users").doc(uid).set({
        role: data.role,
        companyId: data.companyId,
        email: data.email,
      }, { merge: true });
      console.log(`Synced users/${uid} for ${data.name}`);
    }
  }
  console.log("Done syncing users!");
}
main().catch(console.error);
