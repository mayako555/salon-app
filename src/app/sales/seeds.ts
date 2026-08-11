import { db } from "@/lib/firestore-admin-wrapper";
import { collection, writeBatch, doc, serverTimestamp } from "@/lib/firestore-admin-wrapper";

import { SalesMasterItem } from "@/types/master";

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
  // アイブロウメニュー
  { itemType: "menu", category: "アイブロウメニュー", name: "アイブロウワックス", price: 5500 },
  { itemType: "menu", category: "アイブロウメニュー", name: "アイブロウワックス＋間引き", price: 6500 },
  { itemType: "menu", category: "アイブロウメニュー", name: "ハリウッドブロウリフト", price: 7500 },
  
  // マツエクメニュー
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク60本", price: 4500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク80本", price: 5500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク100本", price: 6500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク120本", price: 7500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク140本", price: 8500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク160本", price: 9500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク180本", price: 10500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエク200本", price: 11500 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエクつけ放題1h", price: 7000 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエクつけ放題1.5h", price: 9000 },
  { itemType: "menu", category: "マツエクメニュー", name: "上マツエクつけ放題2h", price: 11000 },
  { itemType: "menu", category: "マツエクメニュー", name: "下マツエク30本まで", price: 3500 },
  { itemType: "menu", category: "マツエクメニュー", name: "下マツエクつけ放題", price: 5500 },
  
  // まつ毛パーマメニュー
  { itemType: "menu", category: "まつ毛パーマメニュー", name: "上まつ毛パーマ", price: 6500 },
  { itemType: "menu", category: "まつ毛パーマメニュー", name: "下まつ毛パーマ", price: 5000 },
  { itemType: "menu", category: "まつ毛パーマメニュー", name: "上下まつげパーマ", price: 10000 },
  
  // 毛質変更
  { itemType: "menu", category: "毛質変更", name: "セーブルに変更", price: 1100 },
  { itemType: "menu", category: "毛質変更", name: "カシミアに変更", price: 1650 },
  { itemType: "menu", category: "毛質変更", name: "カラー部分変更", price: 1100 },
  { itemType: "menu", category: "毛質変更", name: "カラー全体変更", price: 2200 },
  { itemType: "menu", category: "毛質変更", name: "カラーカシミアに変更", price: 2750 },
  { itemType: "menu", category: "毛質変更", name: "２Dボリュームラッシュ", price: 2200 },
  { itemType: "menu", category: "毛質変更", name: "３Dボリュームラッシュ", price: 3300 },
  { itemType: "menu", category: "毛質変更", name: "４Dボリュームラッシュ", price: 4400 },
  { itemType: "menu", category: "毛質変更", name: "５Dボリュームラッシュ", price: 5500 },
  { itemType: "menu", category: "毛質変更", name: "カラー３D", price: 3850 },
  { itemType: "menu", category: "毛質変更", name: "アニメワンホン", price: 2200 },
  { itemType: "menu", category: "毛質変更", name: "ボリュームワンホン", price: 3300 },
  { itemType: "menu", category: "毛質変更", name: "バインドロック", price: 3300 },
  { itemType: "menu", category: "毛質変更", name: "アンドヘルシー", price: 3300 },
  
  // 付け替えオフ
  { itemType: "menu", category: "付け替えオフ", name: "他店付け替えオフ", price: 1100 },
  { itemType: "menu", category: "付け替えオフ", name: "当店付け替えオフ", price: 0 },
  { itemType: "menu", category: "付け替えオフ", name: "他店オフのみ", price: 2200 },
  { itemType: "menu", category: "付け替えオフ", name: "当店オフのみ", price: 1100 },
  { itemType: "menu", category: "付け替えオフ", name: "他店LEDオフ", price: 3300 },
  { itemType: "menu", category: "付け替えオフ", name: "他店バインドロックオフ", price: 3300 },
  
  // その他オプション / その他
  { itemType: "menu", category: "その他オプション", name: "指名料", price: 550 },
  { itemType: "menu", category: "その他オプション", name: "アイシャンプー", price: 550 },
  { itemType: "menu", category: "その他オプション", name: "アイパック", price: 550 },
  { itemType: "menu", category: "その他オプション", name: "トリートメント上", price: 1100 },
  { itemType: "menu", category: "その他オプション", name: "トリートメント上下", price: 2200 },
  { itemType: "menu", category: "その他オプション", name: "スペシャルケア上", price: 2200 },
  { itemType: "menu", category: "その他オプション", name: "スペシャルケア上下", price: 3300 },
  { itemType: "menu", category: "その他オプション", name: "トリートメントキャンペーン", price: 550 },
  { itemType: "menu", category: "その他", name: "低刺激グルー", price: 550 },
  { itemType: "menu", category: "その他", name: "LEDグルー", price: 2200 }
];

const ROKKO_DATA: Partial<SalesMasterItem>[] = [...KOBE_DATA];

export async function seedSalesMasterData() {
  const batch = writeBatch(db);
  const colRef = collection(db, "sales_master");

  const allData = [
    { itemType: "store", category: "店舗", name: "元町", price: 0, store: "共通", isActive: true, openTime: "10:00", closeTime: "19:00" },
    { itemType: "store", category: "店舗", name: "神戸", price: 0, store: "共通", isActive: true, openTime: "10:00", closeTime: "19:00" },
    { itemType: "store", category: "店舗", name: "六甲", price: 0, store: "共通", isActive: true, openTime: "10:00", closeTime: "19:00" },
    ...MOTOMACHI_DATA.map(d => ({ ...d, store: "元町", isActive: true })),
    ...KOBE_DATA.map(d => ({ ...d, store: "神戸", isActive: true })),
    ...ROKKO_DATA.map(d => ({ ...d, store: "六甲", isActive: true }))
  ];

  allData.forEach((d) => {
    const data = d as any;
    const newDocRef = doc(colRef);
    batch.set(newDocRef, {
      ...data,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : 999,
      trackInventory: !!data.trackInventory,
      staffAssignable: !!data.staffAssignable,
      equipmentAssignable: !!data.equipmentAssignable,
      created_at: data.created_at || serverTimestamp(),
      updated_at: serverTimestamp()
    });
  });

  await batch.commit();
  return { success: true, count: allData.length };
}
