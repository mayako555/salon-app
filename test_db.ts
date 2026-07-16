import { adminDb } from "./src/lib/firebase-admin";

async function run() {
  const satoSnap = await adminDb.collection("staff_profiles").where("email", "==", "ruuumiii10612vv@gmail.com").get();
  console.log("Sato:", satoSnap.empty ? "not found" : satoSnap.docs[0].data());
}
run();
