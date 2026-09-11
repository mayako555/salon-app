import { adminDb as db } from "../src/lib/firebase-admin";

const companyId = process.argv[2];
const shouldApply = process.argv.includes("--apply");
const demoDatasetId = "salon-demo-v1";
const collections = [
  "stores",
  "staff_profiles",
  "staff_contracts",
  "sales",
  "shifts",
  "attendance",
  "allowances",
  "allowance_checks",
];

if (!companyId) {
  throw new Error("Usage: npx tsx scripts/rollback-salon-demo.ts <companyId> [--apply]");
}

async function run() {
  const documents: FirebaseFirestore.DocumentReference[] = [];
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName)
      .where("companyId", "==", companyId)
      .where("demoDatasetId", "==", demoDatasetId)
      .get();
    documents.push(...snapshot.docs.map((document) => document.ref));
    console.log(`${collectionName}: ${snapshot.size}`);
  }

  console.log(`Total demo documents: ${documents.length}`);
  if (!shouldApply) {
    console.log("Dry run only. Run again with --apply to delete only these demo documents.");
    return;
  }

  const batch = db.batch();
  documents.forEach((document) => batch.delete(document));
  batch.delete(db.collection("demo_datasets").doc(`${companyId}_${demoDatasetId}`));
  await batch.commit();
  console.log("Demo dataset rolled back.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
