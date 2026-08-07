const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection("attendance")
    .where("date", ">=", "2026-06-01")
    .where("date", "<=", "2026-06-31")
    .get();
    
  const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const higuchi = records.filter(r => r.staff_name && r.staff_name.includes("樋口"));
  
  const byDate = {};
  for (const r of higuchi) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }
  
  const duplicates = Object.entries(byDate).filter(([date, recs]) => recs.length > 1);
  console.log(JSON.stringify(duplicates, null, 2));
}

run().catch(console.error);
