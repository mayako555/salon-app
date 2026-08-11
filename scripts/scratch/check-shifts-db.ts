import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("shifts").where("companyId", "==", "company_default").get();
  console.log(`Shifts for company_default: ${snap.size}`);
  
  const snapAll = await adminDb.collection("shifts").get();
  console.log(`Total shifts: ${snapAll.size}`);
}
run();
