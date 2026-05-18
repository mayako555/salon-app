export type EvaluationRank = "S" | "A" | "B" | "C" | "D";

export type SubCategoryScore = {
  id: string;
  name: string;
  score: number; // 1-5
  is_auto?: boolean; // 自動取得項目かどうか
  value?: number | string; // 実際の数値（売上額など）
};

export type StaffEvaluation = {
  id?: string;
  staff_id: string;
  staff_name: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluation_date: string;
  target_period: string; // e.g. "2024Q2"
  status: "draft" | "completed";
  
  // 大項目別の集計スコア
  category_scores: {
    technology: number;   // 技術
    service: number;      // 接客
    sales: number;        // 売上
    behavior: number;     // 行動
    brand: number;        // ブランド
  };

  // 中分類データ（詳細分析用）
  details: {
    technology: SubCategoryScore[];
    service: SubCategoryScore[];
    sales: SubCategoryScore[];
    behavior: SubCategoryScore[];
    brand: SubCategoryScore[];
  };

  // 定量メトリクス（自動計算項目）
  metrics: {
    total_sales?: number;
    avg_unit_price?: number;
    nomination_rate?: number;
    repeat_rate?: number;
    product_sales_rate?: number;
    google_reviews_count?: number;
    google_reviews_avg?: number;
    attendance_late_count?: number;
    attendance_absence_count?: number;
    rework_count?: number; // お直し件数
    complaint_count?: number; // 技術クレーム件数
  };

  overall_comment: string;
  ai_feedback?: string; // 将来のAI分析用
  overall_rank: EvaluationRank;
  
  // 面談管理
  interview_date?: string;
  interview_status?: "pending" | "completed";
  interview_comment?: string;
  
  // 等級連携用
  current_grade_code: string;
  next_grade_target?: string;
  
  created_at?: any;
  updated_at?: any;
};

export const EVALUATION_CATEGORIES = [
  { id: "technology", name: "技術", color: "purple", description: "品質・持続力・安定性・スピード" },
  { id: "service", name: "接客", color: "indigo", description: "カウンセリング・提案力・安心感" },
  { id: "sales", name: "売上", color: "blue", description: "単価・指名・再来・生産性" },
  { id: "behavior", name: "行動", color: "slate", description: "報連相・責任感・提出物・返信" },
  { id: "brand", name: "ブランド", color: "violet", description: "五星接客・協力性・SNS・理念" },
];

export const RANK_CRITERIA = [
  { rank: "S", min_score: 4.6, color: "text-purple-600 bg-purple-50" },
  { rank: "A", min_score: 4.0, color: "text-emerald-600 bg-emerald-50" },
  { rank: "B", min_score: 3.0, color: "text-blue-600 bg-blue-50" },
  { rank: "C", min_score: 2.0, color: "text-slate-600 bg-slate-50" },
  { rank: "D", min_score: 0.0, color: "text-amber-600 bg-amber-50" },
];

// 等級ごとのカテゴリ比重（ウェイト）設定
// 合計が100%になるように設定
export const GRADE_WEIGHTS: Record<string, Record<string, number>> = {
  "J1": { technology: 40, behavior: 30, service: 10, sales: 10, brand: 10 },
  "J2": { technology: 40, behavior: 25, service: 15, sales: 10, brand: 10 },
  "P1": { technology: 20, behavior: 15, service: 25, sales: 30, brand: 10 },
  "P2": { technology: 15, behavior: 10, service: 30, sales: 35, brand: 10 },
  "M1": { technology: 15, behavior: 25, service: 15, sales: 15, brand: 30 },
  "M2": { technology: 10, behavior: 30, service: 10, sales: 10, brand: 40 },
  "default": { technology: 20, behavior: 20, service: 20, sales: 20, brand: 20 },
};
