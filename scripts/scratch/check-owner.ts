import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const owner = await adminDb.collection("staff_profiles").doc("mywaum7DTUNLrm4b5chd").get();
  console.log(`Owner companyId: ${owner.data()?.companyId}`);
}
run();
