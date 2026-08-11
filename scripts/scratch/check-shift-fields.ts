import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("shifts").limit(1).get();
  console.log(snap.docs[0].data());
}
run();
