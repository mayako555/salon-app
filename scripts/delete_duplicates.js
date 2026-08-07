const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const idsToDelete = [
    "Lw9jjszpPMYV53hxMb4J",
    "SUvnlffmP4X48VpNL4gO",
    "U5PiR4HdMbkCLjYeB9pp",
    "URk6QWI9NCvqk5favXDZ",
    "5DGHS4mkWv0cPFKug04A",
    "eBBm6ITGLCZMfQ7jemNy"
  ];
  
  const batch = db.batch();
  for (const id of idsToDelete) {
    batch.delete(db.collection("attendance").doc(id));
  }
  
  await batch.commit();
  console.log(`Deleted ${idsToDelete.length} invalid duplicate records.`);
}

run().catch(console.error);
