import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const collections = ["shifts", "reservations", "customers", "evaluations", "goals", "paid_leaves", "payroll", "sales", "transactions"];
  for (const col of collections) {
    const snap = await adminDb.collection(col).limit(100).get();
    let missingCount = 0;
    snap.forEach(doc => {
      const data = doc.data();
      if (!data.companyId && !data.tenant_id) missingCount++;
    });
    console.log(`${col}: ${missingCount} / ${snap.size} missing companyId`);
  }
}
run();
