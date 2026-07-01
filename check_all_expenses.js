const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, orderBy, query } = require("firebase/firestore");
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salon-manager-8df21",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const expensesCol = collection(db, "expenses");
  const q = query(expensesCol, orderBy("date", "desc"));
  const snap = await getDocs(q);
  
  const results = [];
  snap.forEach(doc => {
    const data = doc.data();
    results.push({
      id: doc.id,
      date: data.date,
      store: data.store_name,
      category: data.category,
      amount: data.amount,
      desc: data.description,
      imported: data.is_imported ? "CSV" : "手動"
    });
  });
  
  // Group by month
  const byMonth = {};
  results.forEach(r => {
    const month = r.date ? r.date.substring(0, 7) : "Unknown";
    if (!byMonth[month]) byMonth[month] = { count: 0, total: 0, items: [] };
    byMonth[month].count++;
    byMonth[month].total += r.amount;
    byMonth[month].items.push(r);
  });
  
  console.log(JSON.stringify(byMonth, null, 2));
}

main().catch(console.error);
