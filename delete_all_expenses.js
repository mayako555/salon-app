const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salon-manager-8df21",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("Fetching all expenses...");
  const expensesCol = collection(db, "expenses");
  const snap = await getDocs(expensesCol);
  
  const total = snap.docs.length;
  console.log(`Found ${total} expenses. Deleting...`);
  
  let deleted = 0;
  for (const document of snap.docs) {
    await deleteDoc(doc(db, "expenses", document.id));
    deleted++;
    if (deleted % 10 === 0) console.log(`Deleted ${deleted}/${total}`);
  }
  
  console.log("Finished deleting all expenses!");
}

main().catch(console.error);
