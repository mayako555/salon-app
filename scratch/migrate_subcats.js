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
    let newCat = item.category || "その他";
    const name = item.name || "";
    
    // 施術系
    if (item.majorCategory === "施術" || !item.majorCategory) {
      if (newCat.includes("新規") || name.includes("【新規】") || name.includes("新規")) newCat = "新規クーポン";
      else if (newCat.includes("再来") || name.includes("【再来") || name.includes("【リピ】") || name.includes("リピート")) newCat = "再来クーポン";
      else if (newCat.includes("通常") || newCat === "マツエク" || newCat === "マツエクメニュー" || newCat === "まつ毛パーマメニュー" || newCat === "アイブロウメニュー" || newCat === "学割") newCat = "通常メニュー";
      else newCat = "通常メニュー"; // Default for 施術 if it doesn't match
    }
    
    // 店販系
    else if (item.majorCategory === "店販") {
      if (newCat !== "店販" && newCat !== "社販") newCat = "店販";
    }
    
    // 割引・サービス系
    else if (item.majorCategory === "割引・サービス") {
      if (newCat !== "割引" && newCat !== "サービス") newCat = "割引";
    }
    
    // オプション系
    else if (item.majorCategory === "オプション") {
      if (newCat.includes("毛質")) newCat = "毛質変更";
      else if (newCat.includes("オフ")) newCat = "付け替えオフ";
      else newCat = "オプション";
    }

    if (item.category !== newCat) {
      await updateDoc(doc(db, 'sales_master', document.id), {
        category: newCat
      });
      console.log(`Updated ${name}: ${item.category} -> ${newCat}`);
    }
  }
  console.log("Sub-category migration complete");
  process.exit(0);
}

main().catch(console.error);
