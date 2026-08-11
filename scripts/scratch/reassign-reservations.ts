import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const staffSnap = await adminDb.collection("staff_profiles").get();
  const staffNameToCompany = new Map();
  staffSnap.forEach(doc => {
    staffNameToCompany.set(doc.data().name, doc.data().companyId);
  });

  const reservationsSnap = await adminDb.collection("reservations").where("companyId", "==", "company_lumichan_test").get();
  let count = 0;
  
  const batch = adminDb.batch();
  
  reservationsSnap.forEach(doc => {
    const data = doc.data();
    let targetCompany = null;
    let reason = "";
    
    // The missing ones had "manual" or "staff-..."
    // Wait, the ones I updated originally had NO companyId. So they didn't have tenant_id either.
    // I can just re-evaluate all reservations in lumichan_test that I recently updated.
    // Since this is a test environment, let's just check all lumichan_test reservations to see if they belong to company_default.
    
    if (data.staff_id?.startsWith("staff-")) {
      const name = data.staff_id.replace("staff-", "").trim().replace(" ", " "); // e.g., "岡田 万耶子"
      
      // Try to match name with spaces or without spaces
      let matchedCompany = staffNameToCompany.get(name);
      if (!matchedCompany) {
        // Try removing spaces
        for (const [k, v] of staffNameToCompany.entries()) {
          if (k.replace(/\s+/g, '') === name.replace(/\s+/g, '')) {
            matchedCompany = v;
            break;
          }
        }
      }
      
      if (matchedCompany && matchedCompany !== "company_lumichan_test") {
        targetCompany = matchedCompany;
        reason = `Matched staff_id: ${data.staff_id} to ${matchedCompany}`;
      }
    } else if (data.staff_id === "manual") {
      // For "manual", we can check if the store_name belongs to Jasmine Lash.
      // Since stores are not in a DB collection, we know "六甲", "元町", "神戸" are Jasmine Lash stores.
      if (["六甲", "元町", "神戸", "六甲店", "元町店", "神戸店"].includes(data.store_name) || !data.store_name) {
        targetCompany = "company_default";
        reason = `Matched manual reservation in store: ${data.store_name} to company_default`;
      }
    }
    
    if (targetCompany) {
      batch.update(doc.ref, { companyId: targetCompany });
      console.log(`Reservation ${doc.id}: Moving to ${targetCompany} (${reason})`);
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
  }
  console.log(`Re-assigned ${count} reservations.`);
}
run();
