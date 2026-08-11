import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("reservations").limit(100).get();
  snap.forEach(doc => {
    const data = doc.data();
    if (!data.companyId && !data.tenant_id) {
      console.log(`Reservation ${doc.id}: staff_id=${data.staff_id}`);
    }
  });
}
run();
