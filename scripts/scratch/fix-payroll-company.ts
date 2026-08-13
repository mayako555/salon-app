import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // Find all monthly_statements without companyId
  const snap = await adminDb.collection("monthly_statements").get();
  
  const missing = snap.docs.filter(d => !d.data().companyId);
  console.log(`Found ${missing.length} statements without companyId (out of ${snap.size})`);
  missing.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id}: ${data.staff_name} | month=${data.target_month} | status=${data.status}`);
  });

  if (missing.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  // Assign companyId = "company_default" to all without companyId
  const batch = adminDb.batch();
  for (const d of missing) {
    batch.update(d.ref, { companyId: "company_default" });
  }
  await batch.commit();
  console.log(`\n✅ Updated ${missing.length} statements with companyId=company_default`);
}
run();
