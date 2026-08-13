import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const doc = await adminDb.collection("companies").doc("company_lumichan_test").get();
  console.log(doc.data()?.features);
}
run();
