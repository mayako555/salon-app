import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("companies").get();
  snap.forEach(doc => {
    console.log(`Company ${doc.id}: name=${doc.data().name}`);
  });
}
run();
