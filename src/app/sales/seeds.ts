import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";

export type SalesMasterItem = {
  id?: string;
  store: "六甲" | "神戸" | "元町" | "共通";
  itemType: "menu" | "coupon" | "messageCoupon" | "option" | "discount" | "fee";
  category: string;
  name: string;
  internalName?: string;
  price: number;
  duration?: string; // 所要時間
  hpbName?: string;  // HPBクーポン名
  restrictions?: string; // 制約
  notes?: string; // その他
  isActive: boolean;
  staffAssignable?: boolean;
  equipmentAssignable?: boolean;
  created_at?: any;
  updated_at?: any;
};

const MOTOMACHI_DATA: Partial<SalesMasterItem>[] = [
  // 通常メニュー
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス", price: 6600 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋濃さ調整間引き", price: 7000 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋毛流れ修正眉毛パーマ", price: 9500 },
  { itemType: "menu", category: "アイブロウ", name: "メンズアイブロウワックス＋下がりまつ毛矯正パーマ", price: 9500 },
  { itemType: "menu", category: "脱毛", name: "フェイスワックス脱毛3箇所＋メンズアイブロウワックス", price: 11000 },
  { itemType: "menu", category: "脱毛", name: "フェイスワックス脱毛1箇所追加", price: 1500 },
  { itemType: "menu", category: "予約変更", name: "次回予約変更（アイブロウWAX＆眉パーマ／逆まつ毛矯正の方専用）", price: 0 },
  { itemType: "menu", category: "予約変更", name: "次回予約変更（アイブロウ＋フェイシャル脱毛／逆まつ毛矯正セット専用）", price: 0 },
  { itemType: "menu", category: "予約変更", name: "次回予約変更（アイブロウWAXのみの方専用）", price: 0 },
  { itemType: "menu", category: "モデル", name: "有料アイブロウモデル", price: 2000 },
  { itemType: "menu", category: "モデル", name: "無料アイブロウモデル", price: 0 },
  // クーポン
  { itemType: "coupon", category: "クーポン", name: "メンズ眉毛スタイリング＆Wax 6600→3980", price: 3980 },
  { itemType: "coupon", category: "クーポン", name: "メニュー相談クーポン", price: 0 },
  { itemType: "coupon", category: "クーポン", name: "メンズアイブロウスタイリング＆Wax 6600→4400", price: 4400 },
  { itemType: "coupon", category: "クーポン", name: "メンズアイブロウWax＋毛量調整間引き 7000→4950", price: 4950 },
  { itemType: "coupon", category: "クーポン", name: "アイブロウWax＋3D毛流れ矯正眉パーマ 9500→5980", price: 5980 },
  { itemType: "coupon", category: "クーポン", name: "ハリウッドブロウリフト 9500→5980", price: 5980 },
  { itemType: "coupon", category: "クーポン", name: "逆まつげ矯正パーマ 6500→4500", price: 4500 },
  { itemType: "coupon", category: "クーポン", name: "逆まつげ矯正パーマ＋メンズアイブロウWAX", price: 8500 },
  { itemType: "coupon", category: "クーポン", name: "選べる部分美肌WAX脱毛2ヶ所＋メンズアイブロウWAX", price: 7500 },
  { itemType: "coupon", category: "メンテナンス", name: "30分アイブロウメンテナンス", price: 3000 },
  { itemType: "coupon", category: "メンテナンス", name: "アイブロウメンテナンス＋間引き", price: 4000 },
  { itemType: "coupon", category: "メンテナンス", name: "アイブロウメンテナンス＋毛流れ修正3D眉パーマ", price: 6000 },
  { itemType: "coupon", category: "メンテナンス", name: "逆まつげ矯正パーマ 月1メンテナンス", price: 5500 },
  // メッセージクーポン
  { itemType: "messageCoupon", category: "配信", name: "30分アイブロウメンテナンス（口コミ投稿で500円オフ）", price: 2500 }
];

const KOBE_DATA: Partial<SalesMasterItem>[] = [
  // 通常メニュー
  { itemType: "menu", category: "上まつげ", name: "上まつげ 60本", price: 5900 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 80本", price: 6500 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 100本", price: 7500 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 120本", price: 8500 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 140本", price: 9500 },
  { itemType: "menu", category: "まつげパーマ", name: "次世代似合わせまつげパーマ（ラッシュリフト）", price: 6500 },
  { itemType: "menu", category: "アイブロウ", name: "美眉スタイリング＆WAX", price: 5500 },
  // クーポン
  { itemType: "coupon", category: "お試し", name: "選べるラッシュリフトお試し", price: 4400 },
  { itemType: "coupon", category: "つけ放題", name: "フラットラッシュ60分つけ放題", price: 5980 },
  { itemType: "coupon", category: "Healthy", name: "＆Healthy（100本＋まつげパーマ）", price: 8800 },
  // メッセージクーポン
  { itemType: "messageCoupon", category: "再来", name: "Welcome Backクーポン", price: 5000 },
  { itemType: "messageCoupon", category: "つけ放題", name: "シルクエクステ90分つけ放題 3980円", price: 3980 }
];

const ROKKO_DATA: Partial<SalesMasterItem>[] = [
  // 通常メニュー
  { itemType: "menu", category: "親子割", name: "親子割 100本まで", price: 5000 },
  { itemType: "menu", category: "上まつげ", name: "上まつげ 100本", price: 7500 },
  { itemType: "menu", category: "パーマ", name: "似合わせラッシュリフト", price: 6500 },
  // クーポン
  { itemType: "coupon", category: "お試し", name: "上下ラッシュリフトお試し", price: 6600 },
  { itemType: "coupon", category: "Healthy", name: "＆Healthy（100本＋まつげパーマ）", price: 8800 },
  // メッセージクーポン
  { itemType: "messageCoupon", category: "割引", name: "1000円割引クーポン", price: -1000 },
  { itemType: "messageCoupon", category: "限定", name: "DM限定 上まつげ120本コース 5510円", price: 5510 }
];

export async function seedSalesMasterData() {
  const batch = writeBatch(db);
  const colRef = collection(db, "sales_master");

  const allData = [
    ...MOTOMACHI_DATA.map(d => ({ ...d, store: "元町", isActive: true })),
    ...KOBE_DATA.map(d => ({ ...d, store: "神戸", isActive: true })),
    ...ROKKO_DATA.map(d => ({ ...d, store: "六甲", isActive: true }))
  ];

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
  return { success: true, count: allData.length };
}
