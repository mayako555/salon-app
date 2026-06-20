import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: "380205074998",
  appId: "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: "G-PF5G5BNCD5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createLumichanTenant() {
  const companyId = "company_lumichan_test";
  const companyRef = doc(db, "companies", companyId);

  await setDoc(companyRef, {
    name: "ルミちゃん美容室（テスト用）",
    plan: "Test",
    isActive: true,
    isDemoTenant: false,
    createdAt: serverTimestamp(),
    is_setup_complete: false,
    memo: "ルミちゃん導入テスト用テナント。利用ログとフィードバック収集有効。"
  }, { merge: true });

  console.log(`Tenant ${companyId} created successfully with Test plan.`);
  
  // Create an initial admin user for this tenant if requested or needed.
  // For now, the user can just log in or we can assign an existing user.
  // But let's create a default store for it.
  const salesMasterRef = collection(db, "sales_master");
  const storeQuery = query(salesMasterRef, where("companyId", "==", companyId), where("itemType", "==", "store"));
  const storeSnap = await getDocs(storeQuery);
  
  if (storeSnap.empty) {
    await setDoc(doc(salesMasterRef), {
      companyId: companyId,
      itemType: "store",
      name: "メイン店舗",
      isActive: true,
      sortOrder: 1,
      createdAt: serverTimestamp()
    });
    console.log("Default store created.");
  }
}

createLumichanTenant().catch(console.error);
