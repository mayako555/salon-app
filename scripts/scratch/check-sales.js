require("dotenv").config({path: ".env.local"});
const admin = require("firebase-admin");
let pk = process.env.FIREBASE_PRIVATE_KEY;
if (pk.startsWith('"')) { pk = pk.slice(1, -1); }
pk = pk.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: pk
  })
});

const db = admin.firestore();
async function check() {
  const snap = await db.collection("sales").where("source", "==", "hotpepper").limit(10).get();
  console.log("Sales count:", snap.size);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id}, Date: ${data.date}, Staff: ${data.staff_name}, TechSales: ${data.tech_sales}`);
  });
  process.exit(0);
}
check().catch(console.error);
