import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocsFromServer, query, limit } from "firebase/firestore";

async function testTypo() {
  const projectId = "salonapp-e4d2"; // Single 'e'
  console.log(`Testing likely typo: ${projectId}...`);
  try {
    const app = initializeApp({ projectId }, "typo-test");
    const db = getFirestore(app);
    const colRef = collection(db, "staff_profiles");
    const q = query(colRef, limit(1));
    const snapshot = await getDocsFromServer(q);
    console.log("SUCCESS for typo! Found " + snapshot.size + " docs.");
  } catch (error: any) {
    console.log(`FAILED for typo. Error: ${error.message}`);
  }
}

testTypo().then(() => process.exit());
