import { db } from "../src/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

async function testConnection() {
  console.log("Testing Firestore connection...");
  try {
    const colRef = collection(db, "sales_master");
    const q = query(colRef, limit(1));
    const snapshot = await getDocs(q);
    console.log("Success! Found " + snapshot.size + " docs in sales_master.");
    
    const staffRef = collection(db, "staff_profiles");
    const staffSnap = await getDocs(staffRef);
    console.log("Success! Found " + staffSnap.size + " docs in staff_profiles.");
    snapshot.docs.forEach(doc => {
      console.log("Doc ID: " + doc.id, doc.data());
    });
  } catch (error: any) {
    console.error("Connection failed!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
}

testConnection().then(() => process.exit());
