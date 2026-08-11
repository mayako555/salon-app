import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("shifts").limit(1).get();
  
  const spreadSnap = { 
    ...snap,
    empty: snap.empty,
    size: snap.size
  };
  console.log("spread docs?", !!spreadSnap.docs);
  console.log("spread empty?", spreadSnap.empty);
  console.log("spread size?", spreadSnap.size);
}
run();
