import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("staff_profiles").limit(10).get();
  snap.forEach(doc => {
    console.log(`Staff ${doc.id}: name=${doc.data().name}`);
  });
}
run();
