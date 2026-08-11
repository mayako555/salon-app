import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("shifts").where("date", ">=", "2026-08-01").where("date", "<=", "2026-08-31").get();
  console.log(`Shifts for Aug 2026: ${snap.size}`);
}
run();
