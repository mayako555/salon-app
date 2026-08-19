import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // 1. allowances コレクションの修復
  const allowSnap = await adminDb.collection("allowances").get();
  const allowToFix = allowSnap.docs.filter(d => !d.data().companyId);
  console.log(`Allowances total: ${allowSnap.size} | Missing companyId: ${allowToFix.length}件`);

  if (allowToFix.length > 0) {
    const batch = adminDb.batch();
    allowToFix.forEach(d => {
      batch.update(d.ref, { companyId: "company_default" });
    });
    await batch.commit();
    console.log(`✅ ${allowToFix.length}件の allowances に company_default を設定しました`);
  }

  // 2. allowance_checks コレクションの修復
  const checkSnap = await adminDb.collection("allowance_checks").get();
  const checkToFix = checkSnap.docs.filter(d => !d.data().companyId);
  console.log(`Allowance checks total: ${checkSnap.size} | Missing companyId: ${checkToFix.length}件`);

  if (checkToFix.length > 0) {
    const batch = adminDb.batch();
    checkToFix.forEach(d => {
      batch.update(d.ref, { companyId: "company_default" });
    });
    await batch.commit();
    console.log(`✅ ${checkToFix.length}件の allowance_checks に company_default を設定しました`);
  }
  
  console.log("修復処理がすべて完了しました");
}
run();
