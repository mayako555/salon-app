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
  
  let batch = writeBatch(db);
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.merge_status) continue; // Already migrated

    let mergeStatus = '';
    if (data.source === 'hotpepper') {
      mergeStatus = 'CSV_ONLY'; // Treat existing CSV as CSV_ONLY for now
    } else {
      mergeStatus = 'MANUAL_ONLY'; // Manual ones are standalone
    }

    batch.update(doc.ref, {
      merge_status: mergeStatus
    });
    updatedCount++;

    if (updatedCount % 500 === 0) {
      await batch.commit();
      batch = writeBatch(db); // Create a new batch
      console.log(`Committed ${updatedCount} updates`);
    }
  }

  if (updatedCount % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Successfully migrated ${updatedCount} records.`);
}

run().catch(console.error);
