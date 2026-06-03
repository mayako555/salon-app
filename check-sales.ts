import { db } from "./src/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

async function main() {
  const salesSnap = await getDocs(collection(db, "sales"));
  const targetSales = salesSnap.docs.map(d => d.data()).filter(s => 
    (s.staff_name || "").includes("大谷") || (s.staff_name || "").includes("宅見")
  );
  
  const grouped = {};
  targetSales.forEach(s => {
    const key = `${s.staff_name} (ID: ${s.staff_id || "MISSING"})`;
    if (!grouped[key]) grouped[key] = 0;
    grouped[key]++;
  });
  console.log("Sales with raw IDs:", grouped);
  process.exit(0);
}
main();
