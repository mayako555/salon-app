import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: "380205074998",
  appId: "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: "G-PF5G5BNCD5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Checking sales_master collection...");
  try {
    const colRef = collection(db, "sales_master");
    const snapshot = await getDocs(colRef);
    console.log(`Found ${snapshot.size} documents.`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- [${data.store}] ${data.name} (${data.itemType})`);
    });
  } catch (err) {
    console.error("Error fetching documents:", err);
  }
}

check();
