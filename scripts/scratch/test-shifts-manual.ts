import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const targetPrefix = "2026-08";
  const ctx = { companyId: "company_default" };
  
  // getMonthlyShifts logic
  const colRef = adminDb.collection("shifts");
  const q = colRef
    .where("date", ">=", `${targetPrefix}-01`)
    .where("date", "<=", `${targetPrefix}-31`)
    .orderBy("date", "asc");
    
  let snap;
  try {
    snap = await q.where("companyId", "==", ctx.companyId).get();
    console.log("Index query succeeded!");
  } catch (e) {
    console.log("Index query failed, falling back...");
    const rawSnap = await q.get();
    snap = {
      docs: rawSnap.docs.filter((d) => d.data().companyId === ctx.companyId),
    };
  }
  
  const shifts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // getStaffList logic
  const staffSnap = await adminDb.collection("staff_profiles").where("companyId", "==", ctx.companyId).get();
  const allowedStaffIds = new Set(staffSnap.docs.map(d => d.id));
  
  const finalShifts = shifts.filter(s => allowedStaffIds.has(s.staff_id));
  
  console.log(`Final shifts count: ${finalShifts.length}`);
}
run();
