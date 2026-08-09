import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./src/lib/firebase-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "reservations"), orderBy("created_at", "desc"), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(data.customer_name, data.customer_kana, data.portal, data.date, data.start_time);
  });
  process.exit(0);
}
run();
