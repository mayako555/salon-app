import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("reservations").get();
  let batch = adminDb.batch();
  let count = 0;
  
  snap.forEach(doc => {
    const data = doc.data();
    if (!data.companyId && !data.tenant_id) {
      batch.update(doc.ref, { companyId: "company_lumichan_test" });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
  }
  console.log(`Updated ${count} reservations.`);
}
run();
