import { adminDb } from "../../src/lib/firebase-admin";

async function run() {
  const doc = await adminDb.collection("staff_profiles").doc("9twqDqPloMQrgiN9SBCn").get();
  if (doc.exists) {
    console.log(`佐藤瑠美 belongs to: ${doc.data()?.companyId}`);
  } else {
    console.log(`佐藤瑠美 not found in staff_profiles`);
  }
}
run();
