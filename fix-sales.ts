import { db } from "./src/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

async function main() {
  const salesSnap = await getDocs(collection(db, "sales"));
  
  const targetSales = salesSnap.docs.filter(d => {
    const s = d.data();
    return (s.staff_name || "").includes("大谷") || (s.staff_name || "").includes("宅見");
  });
  
  console.log(`Found ${targetSales.length} records to update.`);
  
  const TARGET_STAFF_ID = "cDv2dbISiNxWlarBQmOI";
  const TARGET_STAFF_NAME = "宅見 奈津子";
  
  let batch = writeBatch(db);
  let count = 0;
  
  for (const d of targetSales) {
    batch.update(doc(db, "sales", d.id), {
      staff_id: TARGET_STAFF_ID,
      staff_name: TARGET_STAFF_NAME
    });
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`Committed ${count} updates...`);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
    console.log(`Committed remaining ${count % 400} updates...`);
  }
  
  console.log("Done!");
  process.exit(0);
}
main();
