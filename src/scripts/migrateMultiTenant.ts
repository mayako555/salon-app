const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Run this script using: npx ts-node src/scripts/migrateMultiTenant.ts
// IMPORTANT: Make sure FIREBASE_PRIVATE_KEY is set in environment or load from .env.local

let serviceAccount: any = {};
try {
  serviceAccount = require("../../../serviceAccountKey.json");
} catch (e) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  let formattedKey = rawKey;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  formattedKey = formattedKey.split('\\n').join('\n');
  
  serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: formattedKey,
  };
}

if (!serviceAccount.privateKey) {
  console.error("Missing private key");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const COLLECTIONS = [
  "staff_profiles",
  "customers",
  "sales",
  "sales_master",
  "contracts",
  "monthly_statements",
  "shifts",
  "attendance",
  "time_adjustments",
  "tasks",
  "evaluations",
  "rules",
  "expenses",
  "stores",
  "audit_logs",
  "staff_contracts",
  "kiosk_settings",
  "system_settings"
];

const DEFAULT_COMPANY_ID = "company_default";

async function migrate() {
  console.log(`Starting migration to add companyId: '${DEFAULT_COMPANY_ID}' to all collections`);

  for (const colName of COLLECTIONS) {
    console.log(`Migrating collection: ${colName}`);
    const snapshot = await db.collection(colName).get();
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      if (!doc.data().companyId) {
        batch.update(doc.ref, { companyId: DEFAULT_COMPANY_ID });
        count++;
      }
      
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        console.log(`Committed 400 docs in ${colName}`);
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Committed ${count} docs in ${colName}`);
    }
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
