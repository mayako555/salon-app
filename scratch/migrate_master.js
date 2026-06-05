require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, 'sales_master'));
  for (const document of snapshot.docs) {
    const item = document.data();
    const cat = item.category || "その他";
    let mTab = '施術';
    
    if (cat === '店販' || cat === '社販' || item.itemType === 'product') mTab = '店販';
    else if (cat === '割引' || cat === 'サービス' || item.itemType === 'discount') mTab = '割引・サービス';
    else if (cat === '毛質変更' || cat === 'オプション' || cat === '付け替えオフ' || item.itemType === 'option' || item.itemType === 'fee') mTab = 'オプション';
    else mTab = '施術';
    
    await updateDoc(doc(db, 'sales_master', document.id), {
      majorCategory: mTab
    });
    console.log(`Updated ${item.name} -> ${mTab}`);
  }
  console.log("Migration complete");
  process.exit(0);
}

main().catch(console.error);
