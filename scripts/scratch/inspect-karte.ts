import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // Check karte_records
  const snap = await adminDb.collection("karte_records").limit(5).get();
  console.log(`karte_records count (sample): ${snap.size}`);
  if (!snap.empty) {
    snap.docs.forEach(d => {
      const data = d.data();
      // Show all fields present at the top level and within design
      console.log("\n--- Doc:", d.id);
      console.log("Top-level keys:", Object.keys(data));
      if (data.design) {
        console.log("design keys:", Object.keys(data.design));
        console.log("design values:", data.design);
      }
      console.log("service_type:", data.service_type);
      console.log("visit_type:", data.visit_type);
    });
  }
}
run();
