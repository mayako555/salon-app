import { adminDb } from "../../src/lib/firebase-admin";
const db = adminDb;

const companyId = "nQOSGbsgzhUG2BTLKACU";

async function run() {
  console.log(`Migrating stores from 'stores' to 'sales_master' for companyId: ${companyId}`);
  
  if (typeof db.collection !== "function") {
    console.error("Error: adminDb is a mock/dummy proxy. Please make sure FIREBASE_PRIVATE_KEY is set in environment.");
    process.exit(1);
  }

  // 1. Delete old sales_master store records for this company if any
  const masterSnap = await db.collection("sales_master")
    .where("companyId", "==", companyId)
    .where("itemType", "==", "store")
    .get();
  
  if (masterSnap.size > 0) {
    const batch = db.batch();
    masterSnap.docs.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Deleted ${masterSnap.size} legacy sales_master stores.`);
  }

  // 2. Add Omotesando, Shibuya, Namba, Umeda to sales_master
  const stores = [
    { name: "Salon表参道店", sortOrder: 1 },
    { name: "Salon渋谷店", sortOrder: 2 },
    { name: "Salon難波店", sortOrder: 3 },
    { name: "Salon梅田店", sortOrder: 4 }
  ];

  const batch = db.batch();
  stores.forEach((store, idx) => {
    const ref = db.collection("sales_master").doc(`demo-store-${idx + 1}`);
    batch.set(ref, {
      companyId,
      itemType: "store",
      category: "店舗",
      name: store.name,
      price: 0,
      store: "共通",
      isActive: true,
      openTime: "10:00",
      closeTime: "19:00",
      sortOrder: store.sortOrder
    });
  });

  await batch.commit();
  console.log("Successfully migrated store masters into 'sales_master'!");
}

run().catch(console.error);
