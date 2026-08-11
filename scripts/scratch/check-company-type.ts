import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const doc = await adminDb.collection("companies").doc("company_default").get();
  console.log(`companyType for company_default:`, doc.data()?.companyType);
}
run();
