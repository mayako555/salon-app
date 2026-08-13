import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // Check monthly_statements collection
  const snap = await adminDb.collection("monthly_statements").get();
  console.log(`Found ${snap.size} total statements in monthly_statements`);
  if (!snap.empty) {
    const byMonth: Record<string, number> = {};
    const byCompany: Record<string, number> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      byMonth[data.target_month] = (byMonth[data.target_month] || 0) + 1;
      byCompany[data.companyId || "null"] = (byCompany[data.companyId || "null"] || 0) + 1;
    });
    console.log("By month:", byMonth);
    console.log("By companyId:", byCompany);
    console.log("Sample doc:", snap.docs[0].data());
  }
}
run();
