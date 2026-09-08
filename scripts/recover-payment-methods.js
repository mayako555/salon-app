#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const projectDir = path.resolve(__dirname, "..");
require(path.join(projectDir, "node_modules/@next/env")).loadEnvConfig(projectDir);
const admin = require(path.join(projectDir, "node_modules/firebase-admin"));

const PAYMENT_FIELDS = ["payment_method", "payment_status", "split_payments", "note"];

function privateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  if (raw.trim().startsWith("{")) {
    try { return JSON.parse(raw).private_key; } catch {}
  }
  return raw.replace(/\\n/g, "\n").replace(/"/g, "").trim();
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/[\s　]+/g, "").toLowerCase();
}

function normalizedStore(value) {
  const name = normalize(value);
  if (name.includes("六甲")) return "rokko";
  if (name.includes("神戸")) return "kobe";
  if (name.includes("元町") || name.includes("browgym")) return "motomachi";
  return name;
}

function timeMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function amount(sale) {
  return Number(sale.tech_sales || 0) + Number(sale.product_sales || 0) +
    Number(sale.nomination_fee || 0) - Number(sale.discount || 0);
}

function isImported(sale) {
  return sale.source === "hotpepper" || sale.source === "csv_estimated";
}

function hasEnteredPayment(sale) {
  return Boolean(sale.payment_method && !["未入力", "不明", "cash"].includes(sale.payment_method));
}

function sameStore(a, b) {
  if (a.store_id && b.store_id && a.store_id === b.store_id) return true;
  return Boolean(normalizedStore(a.store_name) && normalizedStore(a.store_name) === normalizedStore(b.store_name));
}

function sameStaff(a, b) {
  if (a.staff_id && b.staff_id && a.staff_id === b.staff_id) return true;
  return Boolean(normalize(a.staff_name) && normalize(a.staff_name) === normalize(b.staff_name));
}

function sameCustomer(a, b) {
  if (a.customer_id && b.customer_id && a.customer_id === b.customer_id) return true;
  return Boolean(normalize(a.customer_name) && normalize(a.customer_name) === normalize(b.customer_name));
}

function sameStrictIdentity(pos, csv) {
  return pos.companyId === csv.companyId && pos.date === csv.date && sameStore(pos, csv) &&
    sameCustomer(pos, csv) && sameStaff(pos, csv) && amount(pos) === amount(csv);
}

function proposedUpdates(sales, reservations) {
  const imports = sales.filter(isImported);
  const payments = sales.filter(sale => sale.source === "checkout" && hasEnteredPayment(sale));
  const proposed = [];
  const stats = {
    paymentRecords: payments.length,
    directSourceId: 0,
    strictReservationEnd: 0,
    strictCalculatedEnd: 0,
    ambiguous: 0,
    noMatch: 0,
    existingSamePayment: 0,
    existingConflict: 0,
    targetCollision: 0,
  };

  for (const payment of payments) {
    const reservation = payment.source_reservation_id ? reservations.get(payment.source_reservation_id) : undefined;
    let candidates = [];
    let strategy = "";

    if (reservation?.source_sales_id) {
      const direct = imports.find(sale => sale.id === reservation.source_sales_id && sale.companyId === payment.companyId);
      if (direct) { candidates = [direct]; strategy = "directSourceId"; }
    }
    if (candidates.length === 0 && reservation) {
      const end = timeMinutes(reservation.end_time);
      candidates = imports.filter(csv => sameStrictIdentity(payment, csv) && timeMinutes(csv.time) === end);
      if (candidates.length === 1) strategy = "strictReservationEnd";
    }
    if (candidates.length === 0) {
      const start = timeMinutes(payment.time);
      const duration = Number(payment.treatment_minutes || 0);
      const expectedEnd = start === null || duration <= 0 ? null : (start + duration) % (24 * 60);
      candidates = expectedEnd === null ? [] : imports.filter(csv =>
        sameStrictIdentity(payment, csv) && timeMinutes(csv.time) === expectedEnd
      );
      if (candidates.length === 1) strategy = "strictCalculatedEnd";
    }

    if (candidates.length > 1) { stats.ambiguous++; continue; }
    if (candidates.length === 0) { stats.noMatch++; continue; }
    const target = candidates[0];
    if (hasEnteredPayment(target)) {
      if (target.payment_method === payment.payment_method) stats.existingSamePayment++;
      else stats.existingConflict++;
      continue;
    }
    stats[strategy]++;
    proposed.push({ source: payment, target, strategy });
  }

  const targetCounts = new Map();
  for (const item of proposed) {
    targetCounts.set(item.target.id, (targetCounts.get(item.target.id) || 0) + 1);
  }
  const safe = proposed.filter(item => targetCounts.get(item.target.id) === 1);
  stats.targetCollision = proposed.length - safe.length;
  return { safe, stats };
}

function fieldSnapshot(record) {
  return Object.fromEntries(PAYMENT_FIELDS.map(field => [field, {
    present: Object.prototype.hasOwnProperty.call(record, field),
    value: record[field],
  }]));
}

function paymentUpdates(source) {
  return Object.fromEntries(PAYMENT_FIELDS
    .filter(field => Object.prototype.hasOwnProperty.call(source, field))
    .map(field => [field, source[field]]));
}

async function loadData(db) {
  const [salesSnapshot, reservationsSnapshot] = await Promise.all([
    db.collection("sales").get(), db.collection("reservations").get(),
  ]);
  return {
    sales: salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(sale => sale.merge_status !== "DELETED"),
    reservations: new Map(reservationsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }])),
  };
}

async function commitInChunks(db, operations) {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(index, index + 400)) {
      batch.update(db.collection("sales").doc(operation.id), operation.updates);
    }
    await batch.commit();
  }
}

async function rollback(db, backupPath) {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  if (backup.projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Backup project does not match the configured Firebase project");
  }
  const operations = backup.records.map(record => ({
    id: record.targetId,
    updates: Object.fromEntries(PAYMENT_FIELDS.map(field => {
      const saved = record.before[field];
      return [field, saved.present ? saved.value : admin.firestore.FieldValue.delete()];
    })),
  }));
  await commitInChunks(db, operations);
  console.log(JSON.stringify({ mode: "rollback", restored: operations.length, backupPath }, null, 2));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rollbackIndex = process.argv.indexOf("--rollback");
  const expectedArg = process.argv.find(arg => arg.startsWith("--expected-count="));
  const backupArg = process.argv.find(arg => arg.startsWith("--backup="));

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

  const { sales, reservations } = await loadData(db);
  const { safe, stats } = proposedUpdates(sales, reservations);
  const totalsBefore = sales.filter(isImported).reduce((sum, sale) => sum + amount(sale), 0);
  const summary = { mode: apply ? "apply" : "dry-run", stats, safeCount: safe.length, totalsBefore };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const expectedCount = Number(expectedArg?.split("=")[1]);
  const backupPath = backupArg?.slice("--backup=".length);
  if (!Number.isInteger(expectedCount) || expectedCount !== safe.length) {
    throw new Error(`Safe count ${safe.length} did not match --expected-count=${expectedCount}`);
  }
  if (!backupPath) throw new Error("--backup=<path> is required in apply mode");
  if (stats.ambiguous || stats.existingConflict || stats.targetCollision) {
    throw new Error("Unsafe candidates detected; refusing to update");
  }

  const backup = {
    version: 1,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    createdAt: new Date().toISOString(),
    totalsBefore,
    records: safe.map(item => ({
      sourceId: item.source.id,
      targetId: item.target.id,
      strategy: item.strategy,
      before: fieldSnapshot(item.target),
    })),
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { flag: "wx", mode: 0o600 });

  await commitInChunks(db, safe.map(item => ({ id: item.target.id, updates: paymentUpdates(item.source) })));

  const verification = await Promise.all(safe.map(item => db.collection("sales").doc(item.target.id).get()));
  const verified = verification.filter((snapshot, index) =>
    snapshot.exists && snapshot.data().payment_method === safe[index].source.payment_method
  ).length;
  const totalsAfter = (await loadData(db)).sales.filter(isImported).reduce((sum, sale) => sum + amount(sale), 0);
  if (verified !== safe.length || totalsAfter !== totalsBefore) {
    throw new Error(`Verification failed: verified=${verified}/${safe.length}, totals=${totalsBefore}/${totalsAfter}`);
  }
  console.log(JSON.stringify({ ...summary, verified, totalsAfter, backupPath }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
