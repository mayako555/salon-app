import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // Get all June statements
  const snap = await adminDb.collection("monthly_statements")
    .where("target_month", "==", "2026-06")
    .get();
  
  console.log(`Found ${snap.size} June 2026 statements`);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: ${data.staff_name} | companyId=${data.companyId} | status=${data.status}`);
  });
}
run();
