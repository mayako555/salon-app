const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
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
  // Get all sales on 06-01 for 元町 store
  const q = query(salesRef, where('date', '==', '2026-06-01'));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.customer_name.includes('ホンナミ') || data.customer_name.includes('本並')) {
      console.log('ID:', doc.id);
      console.log('Time:', data.time);
      console.log('Name:', data.customer_name);
      console.log('Course:', data.menu_course);
      console.log('Source:', data.source);
      console.log('Created:', data.created_at?.toDate ? data.created_at.toDate() : data.created_at);
      console.log('----------------');
    }
  });
}
run();
