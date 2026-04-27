import { db } from "../src/lib/firebase";
import { collection, getDocsFromServer, query, limit } from "firebase/firestore";

async function testStrict() {
  console.log("Testing strict Firestore connection (server-only)...");
  try {
    const colRef = collection(db, "staff_profiles");
    const q = query(colRef, limit(1));
    const snapshot = await getDocsFromServer(q);
    console.log("ACTUAL SUCCESS! Found " + snapshot.size + " docs.");
  } catch (error: any) {
    console.error("ACTUAL FAILURE!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
  }
}

testStrict().then(() => process.exit());
