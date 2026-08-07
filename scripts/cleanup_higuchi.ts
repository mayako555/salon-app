import { db } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

async function run() {
  const q = query(
    collection(db, "attendance"),
    where("date", "==", "2026-06-02"),
    where("staff_id", "==", "oZXXFCb3JJdMiCWScVUE")
  );
  
  const snap = await getDocs(q);
  console.log(`Found ${snap.docs.length} records for Higuchi on 2026-06-02`);
  
  let deleted = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    // Delete the duplicate auto clock out records
    if (data.is_auto_clock_out && data.clock_in && data.clock_in.includes("23:")) {
      console.log(`Deleting duplicate record: ${doc.id}`, data);
      await deleteDoc(doc.ref);
      deleted++;
    }
  }
  
  console.log(`Deleted ${deleted} duplicate records.`);
}

run().catch(console.error);
