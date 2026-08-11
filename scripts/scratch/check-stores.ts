import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("stores").get();
  snap.forEach(doc => {
    console.log(`Store ${doc.id}: name=${doc.data().name}, companyId=${doc.data().companyId}`);
  });
}
run();
