import { adminDb } from "../../src/lib/firebase-admin";

const companyId = "nQOSGbsgzhUG2BTLKACU";
const oldStores = ["元町", "神戸", "六甲"];

async function clean() {
  console.log(`Cleaning old store references for companyId: ${companyId}`);
  
  if (typeof adminDb.collection !== "function") {
    console.error("Error: adminDb is a mock/dummy proxy. Please make sure FIREBASE_PRIVATE_KEY is set in environment.");
    process.exit(1);
  }

  // Clean sales
  const salesSnap = await adminDb.collection("sales")
    .where("companyId", "==", companyId)
    .get();
  
  const salesToDelete = salesSnap.docs.filter((d: any) => oldStores.includes(d.data().store_name));
  if (salesToDelete.length > 0) {
    const batch = adminDb.batch();
    salesToDelete.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleaned ${salesToDelete.length} sales records.`);
  }

  // Clean attendance
  const attSnap = await adminDb.collection("attendance")
    .where("companyId", "==", companyId)
    .get();
  const attToDelete = attSnap.docs.filter((d: any) => oldStores.includes(d.data().store));
  if (attToDelete.length > 0) {
    const batch = adminDb.batch();
    attToDelete.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleaned ${attToDelete.length} attendance records.`);
  }

  // Clean shifts
  const shiftSnap = await adminDb.collection("shifts")
    .where("companyId", "==", companyId)
    .get();
  const shiftToDelete = shiftSnap.docs.filter((d: any) => {
    const segments = d.data().segments || [];
    return segments.some((s: any) => oldStores.includes(s.store));
  });
  if (shiftToDelete.length > 0) {
    const batch = adminDb.batch();
    shiftToDelete.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleaned ${shiftToDelete.length} shift records.`);
  }

  // Clean allowances
  const allowSnap = await adminDb.collection("allowances")
    .where("companyId", "==", companyId)
    .get();
  const allowToDelete = allowSnap.docs.filter((d: any) => oldStores.includes(d.data().store_name));
  if (allowToDelete.length > 0) {
    const batch = adminDb.batch();
    allowToDelete.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Cleaned ${allowToDelete.length} allowance records.`);
  }
  
  console.log("Cleanup finished.");
}

clean().catch(console.error);
