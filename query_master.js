const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const firebaseConfig = {
  projectId: "digital-salon-system"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "sales_master"), where("name", "==", "カシミア"));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run().catch(console.error);
