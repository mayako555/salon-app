import { db } from "./src/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

async function main() {
  const staffSnap = await getDocs(collection(db, "staff_profiles"));
  const staffList = staffSnap.docs.map(d => ({ 
    id: d.id, 
    name: d.data().name, 
    role: d.data().role, 
    companyId: d.data().companyId,
    email: d.data().email 
  }));
  
  console.log("Total staff profiles:", staffList.length);
  console.log(staffList);
  process.exit(0);
}
main();
