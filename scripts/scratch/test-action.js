require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

const app = initializeApp({
  credential: cert({
    projectId: projectId,
    clientEmail: clientEmail,
    privateKey: privateKey
  })
});
const db = getFirestore(app);

async function test() {
  console.log("Fetching sales...");
  const snapshot = await db.collection("sales")
      .where("date", ">=", "2026-05-01")
      .where("date", "<=", "2026-05-31")
      .orderBy("date", "asc")
      .get();
  console.log(`Found ${snapshot.docs.length} sales`);

  console.log("Fetching allowances...");
  const q2 = await db.collection("allowances").where("target_month", "==", "2026-05").get();
  console.log(`Found ${q2.docs.length} allowances`);
  
  console.log("Fetching checks...");
  const q3 = await db.collection("allowance_checks").where("target_month", "==", "2026-05").get();
  console.log(`Found ${q3.docs.length} checks`);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
