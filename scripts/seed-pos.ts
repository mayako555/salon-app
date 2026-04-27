import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";

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

const MOTOMACHI_DATA = [
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス", price: 6600 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋濃さ調整間引き", price: 7000 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋毛流れ修正眉毛パーマ", price: 9500 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋下がりまつ毛矯正パーマ", price: 9500 },
  { itemType: "menu", category: "脱毛", name: "フェイスワックス脱毛3箇所＋メンズアイブロウワックス", price: 11000 },
  { itemType: "menu", category: "脱毛", name: "フェイスワックス脱毛1箇所追加", price: 1500 },
  { itemType: "coupon", category: "クーポン", name: "メンズ眉毛スタイリング＆Wax 6600→3980", price: 3980 },
  { itemType: "coupon", category: "クーポン", name: "メンズアイブロウスタイリング＆Wax 6600→4400", price: 4400 },
  { itemType: "coupon", category: "クーポン", name: "メンズアイブロウWax＋毛量調整間引き 7000→4950", price: 4950 },
  { itemType: "coupon", category: "クーポン", name: "アイブロウWax＋3D毛流れ矯正眉パーマ 9500→5980", price: 5980 },
  { itemType: "messageCoupon", category: "配信", name: "30分アイブロウメンテナンス（口コミ投稿で500円オフ）", price: 2500 }
];

const KOBE_DATA = [
  { itemType: "menu", category: "上まつげ", name: "上まつげ 60本", price: 5900 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 80本", price: 6500 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 100本", price: 7500 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 120本", price: 8500 },
  { itemType: "menu", category: "まつげパーマ", name: "次世代似合わせまつげパーマ（ラッシュリフト）", price: 6500 },
  { itemType: "coupon", category: "お試し", name: "選べるラッシュリフトお試し", price: 4400 },
  { itemType: "coupon", category: "つけ放題", name: "フラットラッシュ60分つけ放題", price: 5980 },
  { itemType: "messageCoupon", category: "再来", name: "Welcome Backクーポン", price: 5000 }
];

const ROKKO_DATA = [
  { itemType: "menu", category: "親子割", name: "親子割 100本まで", price: 5000 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 100本", price: 7500 },
  { itemType: "menu", category: "パーマ", name: "似合わせラッシュリフト", price: 6500 },
  { itemType: "coupon", category: "お試し", name: "上下ラッシュリフトお試し", price: 6600 },
  { itemType: "messageCoupon", category: "割引", name: "1000円割引クーポン", price: -1000 }
];

async function seed() {
  const batch = writeBatch(db);
  const colRef = collection(db, "sales_master");

  const allData = [
    ...MOTOMACHI_DATA.map(d => ({ ...d, store: "元町", isActive: true })),
    ...KOBE_DATA.map(d => ({ ...d, store: "神戸", isActive: true })),
    ...ROKKO_DATA.map(d => ({ ...d, store: "六甲", isActive: true }))
  ];

  console.log(`Seeding ${allData.length} items...`);

  allData.forEach((item) => {
    const newDocRef = doc(colRef);
    batch.set(newDocRef, {
      ...item,
      staffAssignable: false,
      equipmentAssignable: false,
      created_at: new Date()
    });
  });

  await batch.commit();
  console.log("Seeding completed successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
