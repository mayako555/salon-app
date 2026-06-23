require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

async function run() {
  const db = admin.firestore();
  // We want to check sales in 2026-05 for Shibata
  const salesRef = db.collection("sales");
  const snapshot = await salesRef.where("date", ">=", "2026-05-01").where("date", "<=", "2026-05-31").get();
  
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.staff_name && data.staff_name.includes("柴田")) {
      count++;
      console.log(`Sale ID: ${doc.id}`);
      console.log(`  Date: ${data.date}`);
      console.log(`  Staff: ${data.staff_name}`);
      console.log(`  Menu: ${data.menu_course}`);
      console.log(`  Options: ${data.options}`);
      console.log(`  Hair Material: ${data.hair_material}`);
      console.log("-------------------");
    }
  });
  console.log(`Total Shibata sales in 2026-05: ${count}`);
}

run().catch(console.error);
