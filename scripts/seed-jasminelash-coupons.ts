/**
 * Jasminelash ビビビ祭クーポン一括登録スクリプト
 * 実行: npx ts-node --project tsconfig.json scripts/seed-jasminelash-coupons.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";

// Firebase Admin 初期化（環境変数から）
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const COMPANY_ID = "company_jasminelash"; // Jasminelash の companyId
const STORE = "共通"; // 全店舗共通

const coupons = [
  // ===== 新規向け（ビビビ祭） =====
  {
    category: "まつエク・ビビビ祭",
    name: "【ビビビ祭限定★お得な3回券】フラットラッシュ120本＋リペア2回付",
    price: 15000,
    restrictions: "新規",
    notes: "フラットラッシュ120本付け替え1回＋6/12-8/21期限内リペア2回セット。有効期限：2026年08月21日まで",
    hpbName: "【ビビビ祭限定★お得な3回券】フラットラッシュ120本＋リペア2回付 ¥15,000",
  },
  {
    category: "まつエク・ビビビ祭",
    name: "【ビビビ祭】ラッシュリフト＋美眉アイブロウWAX＋高濃度TR",
    price: 10000,
    restrictions: "新規",
    notes: "ラッシュリフト＋アイブロウWAX＋高濃度トリートメントのセット。目元トータルメンテナンス",
    hpbName: "【ビビビ祭】ラッシュリフト＋美眉アイブロウWAX＋高濃度TR ¥10,000",
  },
  {
    category: "まつエク・ビビビ祭",
    name: "【ビビビ祭限定】＆Healthy120本＋下まつ毛エクステ30本",
    price: 12000,
    restrictions: "新規",
    notes: "SNSで話題の＆Healthyと下まつ毛エクステのセットメニュー。有効期限：2026年08月31日まで",
    hpbName: "【ビビビ祭限定】＆Healthy120本＋下まつ毛エクステ30本 ¥12,000",
  },
  // ===== 全員向け（ビビビ祭） =====
  {
    category: "まつエク・ビビビ祭",
    name: "【ビビビ祭】目元垢抜けセット★ラッシュリフト＋美眉アイブロウWAX",
    price: 11000,
    restrictions: "全員",
    notes: "当店人気No.1まつ毛パーマ×眉毛セット。有効期限：2026年08月31日まで",
    hpbName: "【ビビビ祭】目元垢抜けセット★ラッシュリフト＋美眉アイブロウWAX ¥11,000",
  },
  {
    category: "まつエク・ビビビ祭",
    name: "【ビビビ祭】＆Healthy120本＋中顔面短縮♪下まつ毛30本",
    price: 14000,
    restrictions: "全員",
    notes: "＆Healthyに下まつ毛エクステ30本をプラス。中顔面短縮効果も。有効期限：2026年08月31日まで",
    hpbName: "【ビビビ祭】＆Healthy120本＋中顔面短縮♪下まつ毛30本 ¥14,000",
  },
  // ===== 再来向け（2・3回目限定） =====
  {
    category: "まつエク・再来",
    name: "【2回目/3回目の方限定】上まつエク120本",
    price: 5750,
    restrictions: "再来（2回目・3回目）",
    notes: "通常7,700円→5,750円。アイライン効果バツグン。ご来店2・3回目限定。毛質変更は別選択・付け替えのみ",
    hpbName: "【2回目/3回目限定】上まつエク120本 7700円→5750円",
  },
  {
    category: "まつエク・再来",
    name: "【2回目/3回目の方限定】上まつエク140本",
    price: 6900,
    restrictions: "再来（2回目・3回目）",
    notes: "通常8,800円→6,900円。アイライン効果バツグン。ご来店2・3回目限定（マツエクオフ不可）",
    hpbName: "【2回目/3回目限定】上まつエク140本 8800円→6900円",
  },
];

async function seedCoupons() {
  console.log(`\n🎀 Jasminelash ビビビ祭クーポン登録開始 (${coupons.length}件)\n`);

  for (const coupon of coupons) {
    const data = {
      companyId: COMPANY_ID,
      store: STORE,
      itemType: "coupon",
      category: coupon.category,
      name: coupon.name,
      price: coupon.price,
      hpbName: coupon.hpbName,
      restrictions: coupon.restrictions,
      notes: coupon.notes,
      duration: "",
      imageUrl: "",
      isActive: true,
      sortOrder: 999,
      trackInventory: false,
      staffAssignable: true,
      equipmentAssignable: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("sales_master").add(data);
    console.log(`  ✅ 登録: ${coupon.name} (¥${coupon.price.toLocaleString()}) [${coupon.restrictions}] → ID: ${ref.id}`);
  }

  console.log(`\n✨ 完了！${coupons.length}件のクーポンを登録しました。\n`);
}

seedCoupons().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
