import { db } from "./src/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
async function run() {
  const q = query(collection(db, "sales_master"), where("itemType", "==", "product"));
  const snap = await getDocs(q);
  snap.docs.forEach(d => console.log(d.data().name, d.data().price));
}
run();
