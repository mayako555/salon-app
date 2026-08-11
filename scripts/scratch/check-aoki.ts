import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("staff_profiles").get();
  snap.forEach(doc => {
    const data = doc.data();
    if (data.name.includes("青木") || data.name.includes("Aoki")) {
      console.log("Found Aoki:", doc.id, data.companyId, data.name);
    }
  });
  console.log("Total staff count:", snap.size);
}
run();
