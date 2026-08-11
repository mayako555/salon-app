import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("companies").get();
  snap.forEach(doc => {
    console.log(`Company ID: ${doc.id}, Name: ${doc.data().name}`);
  });
}
run();
