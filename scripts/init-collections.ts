// @ts-ignore
import { db } from "../src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

async function initCollections() {
  console.log("Initializing collections...");
  try {
    // Test write to shifts
    const shiftRef = collection(db, "shifts");
    const shiftDoc = await addDoc(shiftRef, {
      staff_id: "test-init",
      staff_name: "Init Tester",
      date: "2026-01-01",
      type: "work",
      segments: [],
      created_at: serverTimestamp()
    });
    console.log("Shifts collection initialized. Doc ID:", shiftDoc.id);

    // Test write to audit_logs
    const auditRef = collection(db, "audit_logs");
    const auditDoc = await addDoc(auditRef, {
      table_name: "system",
      action: "INIT",
      actor: "System",
      timestamp: serverTimestamp()
    });
    console.log("Audit logs collection initialized. Doc ID:", auditDoc.id);

  } catch (error: any) {
    console.error("Initialization failed!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
  }
}

initCollections().then(() => process.exit());
