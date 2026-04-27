import { db } from "../src/lib/firebase";
import { collection, getDocsFromServer, query, limit } from "firebase/firestore";
// @ts-ignore
import { getApp } from "firebase/app";

async function testDiagnostic() {
  const app = getApp();
  console.log("Testing with Project ID:", app.options.projectId);
  console.log("Config:", JSON.stringify(app.options, null, 2));

  console.log("\nAttempting to fetch staff_profiles...");
  try {
    const colRef = collection(db, "staff_profiles");
    const q = query(colRef, limit(1));
    const snapshot = await getDocsFromServer(q);
    console.log("SUCCESS! Found " + snapshot.size + " docs.");
  } catch (error: any) {
    console.error("FAILURE!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    if (error.customData) console.error("CustomData:", error.customData);
  }
}

testDiagnostic().then(() => process.exit());
