const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const salesRef = collection(db, 'sales');
  const snapshot = await getDocs(salesRef);
  
  const allSales = [];
  snapshot.forEach(doc => {
    allSales.push({ id: doc.id, ref: doc.ref, ...doc.data() });
  });

  const groups = {};
  allSales.forEach(sale => {
    const key = sale.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(sale);
  });

  const batch = writeBatch(db);
  let deletedCount = 0;

  for (const key in groups) {
    const group = groups[key];
    const hotpepperRecords = group.filter(s => s.source === 'hotpepper');
    const checkoutRecords = group.filter(s => s.source === 'checkout' || s.source === 'manual');

    for (const hp of hotpepperRecords) {
      const hpTotal = (hp.tech_sales || 0) + (hp.product_sales || 0) - (hp.discount || 0);
      const hpStaff = (hp.staff_name || '').replace(/\s+/g, '');
      
      const duplicates = checkoutRecords.filter(co => {
        const coTotal = (co.tech_sales || 0) + (co.product_sales || 0) - (co.discount || 0);
        const coStaff = (co.staff_name || '').replace(/\s+/g, '');
        return coTotal === hpTotal && (coStaff === hpStaff || coStaff === 'フリー' || hpStaff === 'フリー');
      });

      if (duplicates.length === 1) {
        const dup = duplicates[0];
        console.log(`Found duplicate on ${hp.date}:`);
        console.log(`  Keeping: [HotPepper] ${hp.time} ${hp.customer_name} (staff: ${hp.staff_name}, ¥${hpTotal})`);
        console.log(`  Deleting: [Checkout] ${dup.time} ${dup.customer_name} (staff: ${dup.staff_name}, ¥${(dup.tech_sales||0)+(dup.product_sales||0)-(dup.discount||0)})`);
        batch.delete(dup.ref);
        deletedCount++;
        checkoutRecords.splice(checkoutRecords.indexOf(dup), 1);
      }
    }
  }

  if (deletedCount > 0) {
    await batch.commit();
    console.log(`Successfully deleted ${deletedCount} duplicate records.`);
  } else {
    console.log('No more duplicates found.');
  }
}

run().catch(console.error);
