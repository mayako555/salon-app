import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  await adminDb.collection("companies").doc("company_default").set({
    companyType: "system_owner"
  }, { merge: true });
  console.log("Updated company_default with companyType: system_owner");
}
run();
