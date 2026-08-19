import { adminDb } from "../../src/lib/firebase-admin";
const db = adminDb;

const companyId = "nQOSGbsgzhUG2BTLKACU";

async function run() {
  console.log(`Starting mock menu & reservations seeding for companyId: ${companyId}`);

  if (typeof db.collection !== "function") {
    console.error("Error: adminDb is a mock/dummy proxy.");
    process.exit(1);
  }

  const batch = db.batch();

  // 1. Clean existing mock menus
  const menuSnap = await db.collection("sales_master")
    .where("companyId", "==", companyId)
    .where("itemType", "==", "menu")
    .get();
  
  if (menuSnap.size > 0) {
    const cleanBatch = db.batch();
    menuSnap.docs.forEach((d: any) => cleanBatch.delete(d.ref));
    await cleanBatch.commit();
    console.log(`Deleted ${menuSnap.size} legacy mock menus.`);
  }

  // 2. Add dynamic menus to sales_master
  const menus = [
    { name: "【新規】似合わせアイブロウWAX脱毛", category: "アイブロウ", price: 4980 },
    { name: "【再来】美眉アイブロウスタイリング", category: "アイブロウ", price: 5500 },
    { name: "パリジェンヌラッシュリフト（まつげパーマ）", category: "まつげパーマ", price: 6600 },
    { name: "【&Healthy】フラットラッシュ120本×ラッシュリフト", category: "まつげエクステ", price: 12000 },
    { name: "パラジェル ワンカラー（オフ込）", category: "ネイル", price: 5980 },
    { name: "【持込アート】ネイル90分コース", category: "ネイル", price: 8500 }
  ];

  menus.forEach((menu, idx) => {
    const ref = db.collection("sales_master").doc(`demo-menu-${idx + 1}`);
    batch.set(ref, {
      companyId,
      itemType: "menu",
      category: menu.category,
      name: menu.name,
      price: menu.price,
      store: "共通",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  // 3. Clean existing mock reservations
  const resSnap = await db.collection("reservations")
    .where("companyId", "==", companyId)
    .get();
  
  if (resSnap.size > 0) {
    const cleanBatch = db.batch();
    resSnap.docs.forEach((d: any) => cleanBatch.delete(d.ref));
    await cleanBatch.commit();
    console.log(`Deleted ${resSnap.size} legacy mock reservations.`);
  }

  // 4. Add dynamic reservations (for 2026-08-17 and nearby dates)
  const reservations = [
    {
      staff_id: "demo-staff-1",
      staff_name: "木村 沙織",
      store_name: "Salon表参道店",
      customer_name: "佐々木 希 様",
      customer_kana: "ササキ ノゾミ",
      date: "2026-08-17",
      start_time: "10:00",
      end_time: "11:30",
      menu_name: "パリジェンヌラッシュリフト（まつげパーマ）",
      portal: "HPB",
      status: "completed",
      customer_type: "新規",
      expected_price: 6600,
      is_nominated: true
    },
    {
      staff_id: "demo-staff-1",
      staff_name: "木村 沙織",
      store_name: "Salon表参道店",
      customer_name: "石原 さとみ 様",
      customer_kana: "イシハラ サトミ",
      date: "2026-08-17",
      start_time: "13:00",
      end_time: "14:30",
      menu_name: "【&Healthy】フラットラッシュ120本×ラッシュリフト",
      portal: "HPB",
      status: "booked",
      customer_type: "再来",
      expected_price: 12000,
      is_nominated: true
    },
    {
      staff_id: "demo-staff-2",
      staff_name: "長谷川 麗奈",
      store_name: "Salon渋谷店",
      customer_name: "北川 景子 様",
      customer_kana: "キタガワ ケイコ",
      date: "2026-08-17",
      start_time: "11:00",
      end_time: "12:00",
      menu_name: "【新規】似合わせアイブロウWAX脱毛",
      portal: "Minimo",
      status: "booked",
      customer_type: "モデル",
      expected_price: 4980,
      is_nominated: false
    },
    {
      staff_id: "demo-staff-3",
      staff_name: "渡辺 美優",
      store_name: "Salon難波店",
      customer_name: "新垣 結衣 様",
      customer_kana: "アラガキ ユイ",
      date: "2026-08-17",
      start_time: "15:00",
      end_time: "16:30",
      menu_name: "パラジェル ワンカラー（オフ込）",
      portal: "Nailie",
      status: "booked",
      customer_type: "再来",
      expected_price: 5980,
      is_nominated: true
    }
  ];

  reservations.forEach((res, idx) => {
    const ref = db.collection("reservations").doc(`demo-res-${idx + 1}`);
    batch.set(ref, {
      ...res,
      companyId,
      source: "manual",
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  await batch.commit();
  console.log("Successfully seeded menu master & reservation mock data!");
}

run().catch(console.error);
