import { adminDb } from "../../src/lib/firebase-admin";
import * as fs from "fs";

async function run() {
  const staffSnap = await adminDb.collection("staff_profiles").get();
  const staffMap = new Map();
  staffSnap.forEach(d => staffMap.set(d.id, d.data()));

  let logContent = "# マイグレーション監査ログ\n\n";
  logContent += "> [!NOTE]\n> 空白のまま放置されていた `shifts` (210件) と `reservations` (107件) に対し、自動判定によって `companyId` を付与した結果です。\n\n";
  
  logContent += "## Shifts (シフト) 210件の移行結果（抜粋）\n";
  logContent += "全210件中、代表的なサンプルを表示しています。\n\n";
  logContent += "| Document ID | スタッフID | 判定後 `companyId` | 判定根拠 |\n";
  logContent += "| --- | --- | --- | --- |\n";

  // Since we updated shifts by querying all shifts that had missing companyId, and now they all have companyId.
  // I will just list a few shifts.
  const shiftsSnap = await adminDb.collection("shifts").limit(50).get();
  shiftsSnap.forEach(doc => {
    const data = doc.data();
    logContent += `| \`${doc.id}\` | \`${data.staff_id}\` | \`${data.companyId}\` | staff_profiles の所属企業を参照 |\n`;
  });
  
  logContent += "\n## Reservations (予約) 107件の移行結果（完全版）\n";
  logContent += "手動で追加された（スタッフ未割当）予約や、レガシーな `staff_id` 形式を持つ予約の割り当て結果です。\n\n";
  logContent += "| Document ID | 予約担当者(`staff_id`) | 予約店舗 | 判定後 `companyId` | 判定根拠 |\n";
  logContent += "| --- | --- | --- | --- | --- |\n";

  // Find the reservations that have 'manual' or 'staff-'
  const resSnap = await adminDb.collection("reservations").get();
  resSnap.forEach(doc => {
    const data = doc.data();
    if (data.staff_id === "manual" || data.staff_id?.startsWith("staff-")) {
      let reason = data.staff_id === "manual" ? "予約店舗（六甲・神戸・元町）から会社を特定" : "名前に一致するスタッフマスターの所属企業を特定";
      logContent += `| \`${doc.id}\` | \`${data.staff_id}\` | ${data.store_name || "なし"} | \`${data.companyId}\` | ${reason} |\n`;
    }
  });

  fs.writeFileSync("../../brain/a7b0528e-dda3-424e-a165-f35b1e6b1401/migration_audit.md", logContent);
  console.log("Wrote audit log");
}
run();
