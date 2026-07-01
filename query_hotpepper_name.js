const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
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
  const q = query(salesRef, where('customer_name', '==', 'HotPepper経由'));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log('---');
    console.log('ID:', doc.id);
    console.log('Date:', d.date);
    console.log('Time:', d.time);
    console.log('Name:', d.customer_name);
    console.log('Source:', d.source);
    console.log('Route:', d.reservation_route);
    console.log('Minimo:', d.is_minimo);
  });
}
run();
