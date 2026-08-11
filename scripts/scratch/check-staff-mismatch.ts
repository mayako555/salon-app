import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const shiftsSnap = await adminDb.collection("shifts").where("companyId", "==", "company_default").limit(20).get();
  const staffIdsInShifts = new Set();
  shiftsSnap.forEach(s => staffIdsInShifts.add(s.data().staff_id));
  
  const staffSnap = await adminDb.collection("staff_profiles").where("companyId", "==", "company_default").get();
  const staffIdsInDb = new Set();
  staffSnap.forEach(s => staffIdsInDb.add(s.id));
  
  console.log("Staff IDs in shifts:", Array.from(staffIdsInShifts));
  console.log("Staff IDs in DB:", Array.from(staffIdsInDb));
  
  const missing = Array.from(staffIdsInShifts).filter(id => !staffIdsInDb.has(id));
  console.log("Shift staff_ids missing from DB:", missing);
}
run();
