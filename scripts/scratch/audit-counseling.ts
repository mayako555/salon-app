import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const snap = await adminDb.collection("counseling_responses").get();
  console.log(`Total counseling_responses: ${snap.size}`);

  const answerKeys = new Set<string>();
  const serviceTypeSets = new Set<string>();

  snap.docs.forEach(d => {
    const data = d.data();
    if (data.answers) Object.keys(data.answers).forEach(k => answerKeys.add(k));
    if (data.service_types) (data.service_types as string[]).forEach(s => serviceTypeSets.add(s));
  });

  console.log("\nAll counseling answer keys:", [...answerKeys].sort());
  console.log("\nAll service_types used in counseling:", [...serviceTypeSets]);
}
run();
