import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("attendance").get();
  
  const toFix = snap.docs.filter(d => !d.data().companyId);
  console.log(`Total: ${snap.size} | companyId未設定: ${toFix.length}件`);

  if (toFix.length === 0) {
    console.log("修正不要です");
    return;
  }

  // Show breakdown by month
  const byMonth: Record<string, number> = {};
  toFix.forEach(d => {
    const month = (d.data().date || "unknown").slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  });
  console.log("月別内訳:", byMonth);

  // Batch update in chunks of 500
  const BATCH_SIZE = 500;
  let count = 0;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const chunk = toFix.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    chunk.forEach(d => {
      batch.update(d.ref, { companyId: "company_default" });
    });
    await batch.commit();
    count += chunk.length;
    console.log(`  → ${count}/${toFix.length}件 更新済み`);
  }

  console.log(`\n✅ ${toFix.length}件に companyId=company_default を設定しました`);
}
run();
