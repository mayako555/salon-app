import { adminAuth, adminDb } from "./src/lib/firebase-admin";

async function main() {
  const email = "mayakoinny@gmail.com";
  const snapshot = await adminDb.collection("staff_profiles").where("email", "==", email).limit(1).get();
  if (snapshot.empty) {
    console.log("No profile found");
  } else {
    const data = snapshot.docs[0].data();
    console.log("User Data:", data);
    const ctxRole = data.role || "staff";
    const ctxCompanyId = data.companyId || "company_default";
    console.log("CTX:", { role: ctxRole, companyId: ctxCompanyId });
  }
  process.exit(0);
}
main();
