import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";

const firebaseConfig = {
  projectId: "salonapp-ee4d2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "sales"), where("source", "==", "hotpepper"), orderBy("created_at", "desc"), limit(5));
  const snap = await getDocs(q);
  snap.docs.forEach(d => console.log(d.id, d.data()));
}
run().catch(console.error);
