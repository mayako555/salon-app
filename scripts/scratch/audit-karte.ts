import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  // Get all karte_records and find unique fields
  const snap = await adminDb.collection("karte_records").get();
  console.log(`Total karte_records: ${snap.size}`);

  const topKeys = new Set<string>();
  const designKeys = new Set<string>();
  const serviceTypes = new Set<string>();
  const visitTypes = new Set<string>();

  snap.docs.forEach(d => {
    const data = d.data();
    Object.keys(data).forEach(k => topKeys.add(k));
    if (data.design) Object.keys(data.design).forEach(k => designKeys.add(k));
    if (data.service_type) serviceTypes.add(data.service_type);
    if (data.visit_type) visitTypes.add(data.visit_type);
    if (data.menu_type) serviceTypes.add("OLD:menu_type=" + data.menu_type);
  });

  console.log("\nAll top-level keys found:", [...topKeys].sort());
  console.log("\nAll design keys found:", [...designKeys].sort());
  console.log("\nAll service_type values:", [...serviceTypes]);
  console.log("\nAll visit_type values:", [...visitTypes]);

  // Check counseling_responses
  const cSnap = await adminDb.collection("counseling_responses").limit(3).get();
  console.log(`\nTotal counseling_responses (sample): ${cSnap.size}`);
  if (!cSnap.empty) {
    const data = cSnap.docs[0].data();
    console.log("counseling top-level keys:", Object.keys(data));
    console.log("answers keys:", Object.keys(data.answers || {}));
  }
}
run();
