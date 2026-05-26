const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = { projectId: "salon-app-demo" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const date = new Date().toISOString().split('T')[0]; // today
  const resCol = collection(db, 'reservations');
  
  await addDoc(resCol, {
    store_name: "六甲",
    staff_id: "test",
    staff_name: "大谷 奈津子",
    customer_name: "テスト花子",
    customer_kana: "テストハナコ",
    date: date,
    start_time: "10:00",
    end_time: "11:30",
    menu_name: "まつ毛パーマ + アイブロウ",
    portal: "HPB",
    status: "booked",
    memo: "初めての来店。まつ毛が上がりづらいとのこと",
    expected_price: 8800,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  await addDoc(resCol, {
    store_name: "六甲",
    staff_id: "test2",
    staff_name: "柴田 真凛",
    customer_name: "山田 太郎",
    date: date,
    start_time: "13:00",
    end_time: "14:00",
    menu_name: "アイブロウワックス",
    portal: "Minimo",
    status: "arrived",
    expected_price: 4400,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  
  console.log("Seeded reservations");
}
seed();
