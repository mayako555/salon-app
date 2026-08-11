import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const staffCache = new Map();

  async function getStaffCompanyId(staffId) {
    if (!staffId) return null;
    if (staffCache.has(staffId)) return staffCache.get(staffId);
    
    const staffDoc = await adminDb.collection("staff_profiles").doc(staffId).get();
    if (staffDoc.exists) {
      const cid = staffDoc.data().companyId;
      staffCache.set(staffId, cid);
      return cid;
    }
    return null;
  }

  const collections = ["shifts", "reservations"];

  for (const col of collections) {
    console.log(`Migrating ${col}...`);
    const snap = await adminDb.collection(col).get();
    let updatedCount = 0;
    
    // Batch updates for efficiency
    let batch = adminDb.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.companyId && data.staff_id) {
        const companyId = await getStaffCompanyId(data.staff_id);
        if (companyId) {
          batch.update(doc.ref, { companyId });
          batchCount++;
          updatedCount++;

          if (batchCount >= 400) {
            await batch.commit();
            batch = adminDb.batch();
            batchCount = 0;
            console.log(`  Committed 400 updates to ${col}`);
          }
        }
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    console.log(`Finished ${col}: Updated ${updatedCount} documents.`);
  }
}

run().catch(console.error);
