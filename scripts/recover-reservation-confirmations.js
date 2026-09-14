#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const projectDir = path.resolve(__dirname, "..");
require(path.join(projectDir, "node_modules/@next/env")).loadEnvConfig(projectDir);
const admin = require(path.join(projectDir, "node_modules/firebase-admin"));

function privateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  if (raw.trim().startsWith("{")) return JSON.parse(raw).private_key;
  return raw.replace(/\\n/g, "\n").replace(/"/g, "").trim();
}

function hasEnteredPayment(value) {
  return Boolean(value && !["未入力", "不明", ""].includes(value));
}

function saleAmount(sale) {
  return Number(sale.tech_sales || 0) + Number(sale.product_sales || 0) +
    Number(sale.nomination_fee || 0) - Number(sale.discount || 0);
}

async function loadCandidates(db, companyId) {
  const [reservationsSnapshot, salesSnapshot] = await Promise.all([
    db.collection("reservations").where("companyId", "==", companyId).get(),
    db.collection("sales").where("companyId", "==", companyId).get(),
  ]);
  const sales = new Map(salesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
  const candidates = reservationsSnapshot.docs.filter(doc => {
    const reservation = doc.data();
    const sale = reservation.source_sales_id && sales.get(reservation.source_sales_id);
    return reservation.status === "completed" && reservation.is_confirmed !== true &&
      sale && hasEnteredPayment(sale.payment_method);
  });
  const totalSales = [...sales.values()].reduce((sum, sale) => sum + saleAmount(sale), 0);
  return { candidates, totalSales };
}

async function commitInChunks(db, operations) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(index, index + 400)) operation(batch);
    await batch.commit();
  }
}

async function rollback(db, backupPath) {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  if (backup.projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Backup project does not match the configured Firebase project");
  }
  await commitInChunks(db, backup.records.map(record => batch => {
    const value = record.isConfirmed.present
      ? record.isConfirmed.value
      : admin.firestore.FieldValue.delete();
    batch.update(db.collection("reservations").doc(record.id), { is_confirmed: value });
  }));
  console.log(JSON.stringify({ mode: "rollback", restored: backup.records.length, backupPath }, null, 2));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rollbackIndex = process.argv.indexOf("--rollback");
  const companyArg = process.argv.find(arg => arg.startsWith("--company="));
  const expectedArg = process.argv.find(arg => arg.startsWith("--expected-count="));
  const backupArg = process.argv.find(arg => arg.startsWith("--backup="));
  const companyId = companyArg?.slice("--company=".length);

  admin.initializeApp({ credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey(),
  }) });
  const db = admin.firestore();

  if (rollbackIndex >= 0) {
    const backupPath = process.argv[rollbackIndex + 1];
    if (!backupPath) throw new Error("Usage: --rollback <backup-path>");
    await rollback(db, backupPath);
    return;
  }
  if (!companyId) throw new Error("--company=<company-id> is required");

  const before = await loadCandidates(db, companyId);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    companyId,
    candidateCount: before.candidates.length,
    totalSalesBefore: before.totalSales,
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const expectedCount = Number(expectedArg?.split("=")[1]);
  const backupPath = backupArg?.slice("--backup=".length);
  if (!Number.isInteger(expectedCount) || expectedCount !== before.candidates.length) {
    throw new Error(`Candidate count ${before.candidates.length} did not match --expected-count=${expectedCount}`);
  }
  if (!backupPath) throw new Error("--backup=<path> is required in apply mode");

  const backup = {
    version: 1,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    companyId,
    createdAt: new Date().toISOString(),
    totalSalesBefore: before.totalSales,
    records: before.candidates.map(doc => ({
      id: doc.id,
      isConfirmed: {
        present: Object.prototype.hasOwnProperty.call(doc.data(), "is_confirmed"),
        value: doc.data().is_confirmed,
      },
    })),
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { flag: "wx", mode: 0o600 });

  await commitInChunks(db, before.candidates.map(doc => batch => {
    batch.update(db.collection("reservations").doc(doc.id), { is_confirmed: true });
  }));

  const after = await loadCandidates(db, companyId);
  if (after.candidates.length !== 0 || after.totalSales !== before.totalSales) {
    throw new Error(`Verification failed: candidates=${after.candidates.length}, sales=${before.totalSales}/${after.totalSales}`);
  }
  console.log(JSON.stringify({
    ...summary,
    restored: before.candidates.length,
    remainingCandidates: after.candidates.length,
    totalSalesAfter: after.totalSales,
    backupPath,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
