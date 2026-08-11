import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  console.log("Checking Jasmine Lash (company_default) independence...");
  
  const shiftsSnap = await adminDb.collection("shifts").where("companyId", "==", "company_default").get();
  
  // Verify all shifts belong to company_default's staff
  const staffSnap = await adminDb.collection("staff_profiles").where("companyId", "==", "company_default").get();
  const validStaffIds = new Set(staffSnap.docs.map(d => d.id));
  
  let invalidShifts = 0;
  shiftsSnap.forEach(s => {
    if (!validStaffIds.has(s.data().staff_id)) {
      invalidShifts++;
      console.log(`Invalid shift ${s.id}: staff_id=${s.data().staff_id}`);
    }
  });
  
  console.log(`Invalid shifts in Jasmine Lash: ${invalidShifts} / ${shiftsSnap.size}`);
}
run();
