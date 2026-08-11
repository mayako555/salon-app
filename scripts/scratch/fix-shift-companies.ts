import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const staffSnap = await adminDb.collection("staff_profiles").get();
  const staffToCompany = new Map();
  staffSnap.forEach(d => staffToCompany.set(d.id, d.data().companyId));

  const shiftsSnap = await adminDb.collection("shifts").get();
  let count = 0;
  const batch = adminDb.batch();

  shiftsSnap.forEach(doc => {
    const data = doc.data();
    if (data.staff_id && staffToCompany.has(data.staff_id)) {
      const correctCompany = staffToCompany.get(data.staff_id);
      if (data.companyId !== correctCompany) {
        batch.update(doc.ref, { companyId: correctCompany });
        console.log(`Fixing shift ${doc.id} for staff ${data.staff_id} to ${correctCompany}`);
        count++;
      }
    }
  });

  if (count > 0) await batch.commit();
  console.log(`Fixed ${count} shifts.`);
}
run();
