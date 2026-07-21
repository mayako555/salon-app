import { adminDb } from "../src/lib/firebase-admin";

async function main() {
  const snapshot = await adminDb.collection("attendance").where("staff_name", "==", "宅見 奈津子").get();
  snapshot.docs.forEach((doc: any) => {
    console.log(doc.data().date, doc.data().clock_in, doc.data().effective_clock_in);
  });
}
main().catch(console.error);
