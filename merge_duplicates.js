const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, serverTimestamp } = require('firebase/firestore');
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
  let mergedCount = 0;

  for (const key in groups) {
    const group = groups[key];
    const hotpepperRecords = group.filter(s => s.source === 'hotpepper');
    const checkoutRecords = group.filter(s => s.source === 'checkout' || s.source === 'manual');

    for (const hp of hotpepperRecords) {
      const hpTotal = (hp.tech_sales || 0) + (hp.product_sales || 0) + (hp.nomination_fee || 0) - (hp.discount || 0);
      const hpStaff = (hp.staff_name || '').replace(/\s+/g, '');
      
      const duplicates = checkoutRecords.filter(co => {
        const coTotal = (co.tech_sales || 0) + (co.product_sales || 0) + (co.nomination_fee || 0) - (co.discount || 0);
        const coStaff = (co.staff_name || '').replace(/\s+/g, '');
        return coTotal === hpTotal && (coStaff === hpStaff || coStaff === 'フリー' || hpStaff === 'フリー');
      });

      if (duplicates.length === 1) {
        const dup = duplicates[0];
        console.log(`Found duplicate to merge on ${hp.date}:`);
        console.log(`  HP: ${hp.time} ${hp.customer_name} (¥${hpTotal})`);
        console.log(`  CO: ${dup.time} ${dup.customer_name} (¥${hpTotal})`);
        
        // Merge manual checkout info into HotPepper record
        batch.update(hp.ref, {
          payment_method: dup.payment_method || hp.payment_method,
          payment_status: dup.payment_status || hp.payment_status || 'unpaid',
          discount: dup.discount || hp.discount || 0,
          discount_reason: dup.discount_reason || hp.discount_reason || '',
          options: dup.options || hp.options || '',
          note: dup.note || hp.note || '',
          updated_at: serverTimestamp()
        });

        // Delete the checkout record
        batch.delete(dup.ref);
        mergedCount++;
        checkoutRecords.splice(checkoutRecords.indexOf(dup), 1);
      }
    }
  }

  if (mergedCount > 0) {
    await batch.commit();
    console.log(`Successfully merged and deleted ${mergedCount} duplicate records.`);
  } else {
    console.log('No more duplicates found.');
  }
}

run().catch(console.error);
