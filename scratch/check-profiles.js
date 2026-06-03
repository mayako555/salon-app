require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, 'staff_profiles'));
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.name && (data.name.includes('maya') || data.name.includes('マヤ') || data.role === 'companyOwner' || data.role === 'systemOwner' || data.companyId)) {
      console.log('Profile:', doc.id, data.name, 'role:', data.role, 'companyId:', data.companyId, 'salonIds:', data.salonIds);
    }
  });
}
check();
