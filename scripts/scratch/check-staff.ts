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
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: cert
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

async function main() {
  const staff = await db.collection("staff_profiles").where("name", "==", "青木 景子").get();
  console.log("Staff found:", staff.size);
  staff.forEach(d => console.log(d.id, d.data().companyId, d.data().storeId, d.data().name));
  
  // also check shifts
  const shifts = await db.collection("shifts").where("staffId", "==", staff.docs[0]?.id).get();
  console.log("Shifts found:", shifts.size);
  if (shifts.size > 0) {
      console.log(shifts.docs[0].data());
  }
}
main().catch(console.error);
