export interface FAQItem {
  id?: string;
  category: string;
  question: string;
  answer: string;
  search_terms: string[];
  target_roles: string[];
  is_published: boolean;
  related_screen?: string;
  created_at?: string;
  updated_at?: string;
}

export const FAQ_CATEGORIES = [
  "初期設定",
  "ログイン・アカウント",
  "スマートフォンでの使用方法",
  "店舗設定",
  "スタッフ設定",
  "権限設定",
  "売上管理",
  "CSV取込",
  "勤怠管理",
  "給与計算",
  "経費管理",
  "目標管理",
  "タスク管理",
  "LINE連携",
  "通知",
  "データの修正、削除",
  "エラー、トラブル",
  "その他"
];
