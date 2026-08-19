import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("bank_accounts").get();
  console.log(`Total: ${snap.size}`);

  // Group by name + companyId, keep one per name, delete duplicates
  const seen = new Map<string, string>(); // key -> docId to keep
  const toDelete: string[] = [];

  // Sort by created_at asc to keep oldest
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  docs.sort((a, b) => (a.created_at?._seconds || 0) - (b.created_at?._seconds || 0));

  for (const doc of docs) {
    const key = `${doc.companyId}__${doc.name}`;
    if (seen.has(key)) {
      toDelete.push(doc.id);
      console.log(`  DUPLICATE: ${doc.id} (${doc.name})`);
    } else {
      seen.set(key, doc.id);
      console.log(`  KEEP: ${doc.id} (${doc.name})`);
    }
  }

  console.log(`\nWill delete ${toDelete.length} duplicates`);

  if (toDelete.length === 0) return;

  const batch = adminDb.batch();
  toDelete.forEach(id => batch.delete(adminDb.collection("bank_accounts").doc(id)));
  await batch.commit();
  console.log("✅ Deleted duplicates");
}
run();
