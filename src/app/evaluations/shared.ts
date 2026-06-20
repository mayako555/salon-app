export type EvaluationRole = "general" | "educator" | "sub_manager" | "manager" | "area_manager";

export type EvaluationRank = "S" | "A" | "B" | "C" | "D";

export type AutoEvaluationRule = {
  id: string;
  label: string;
  category: "sales" | "repeat" | "satisfaction" | "tech_quality" | "marketing" | "attendance" | "team_contribution" | "operations" | "company_contribution";
  maxScore: number;
  unit: string;
  thresholds: { min: number; score: number }[]; // Needs to handle "less is better" for some (e.g. late count), so maybe "min" isn't enough, but let's assume min means >= for positive, or <= for negative depending on category? Let's just use a simple function or assume min for now. Actually, let's add `operator: ">=" | "<="`.
  operator: ">=" | "<=";
  isManualInput: boolean;
};

export type ManagerEvaluationItem = {
  id: string;
  label: string;
  category: "technical" | "customer_service" | "team_contribution" | "company_contribution" | "operations" | "marketing";
};

export type EvaluationTemplate = {
  id: string;
  role: EvaluationRole;
  roleName: string;
  autoItems: AutoEvaluationRule[];
  managerItems: ManagerEvaluationItem[];
  managerMaxScore: number;
};

export type StaffEvaluation = {
  id: string;
  staff_id: string;
  evaluator_id: string;
  target_year: number;
  target_quarter: number;
  template_id: string;
  
  auto_metrics: Record<string, number>;
  auto_scores: Record<string, number>;
  manager_raw_scores: Record<string, number>;
  
  calculated_scores: {
    auto_total: number;
    manager_total: number;
    total: number;
  };

  rank: EvaluationRank;
  status: "draft" | "pending" | "finalized";
  comments: string;
  snapshot?: {
    template: EvaluationTemplate;
  };
  created_at?: any;
  updated_at?: any;
};

export const EVALUATION_TEMPLATES: Record<EvaluationRole, EvaluationTemplate> = {
  general: {
    id: "template_general",
    role: "general",
    roleName: "一般スタッフ",
    managerMaxScore: 30,
    autoItems: [
      { id: "sales_target_ratio", label: "売上目標達成率", category: "sales", maxScore: 10, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 100, score: 10}, {min: 80, score: 5}, {min: 0, score: 0}] },
      { id: "monthly_sales", label: "月平均売上", category: "sales", maxScore: 5, unit: "円", operator: ">=", isManualInput: false, thresholds: [{min: 800000, score: 5}, {min: 500000, score: 3}, {min: 0, score: 0}] },
      { id: "unit_price", label: "客単価", category: "sales", maxScore: 5, unit: "円", operator: ">=", isManualInput: false, thresholds: [{min: 8000, score: 5}, {min: 6000, score: 3}, {min: 0, score: 0}] },
      { id: "next_booking_rate", label: "次回予約率", category: "repeat", maxScore: 10, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 60, score: 10}, {min: 40, score: 5}, {min: 0, score: 0}] },
      { id: "nomination_count", label: "指名数", category: "repeat", maxScore: 5, unit: "件", operator: ">=", isManualInput: false, thresholds: [{min: 30, score: 5}, {min: 10, score: 3}, {min: 0, score: 0}] },
      { id: "review_count", label: "口コミ件数", category: "satisfaction", maxScore: 5, unit: "件", operator: ">=", isManualInput: true, thresholds: [{min: 10, score: 5}, {min: 5, score: 3}, {min: 0, score: 0}] },
      { id: "review_score", label: "口コミ評価", category: "satisfaction", maxScore: 5, unit: "点", operator: ">=", isManualInput: true, thresholds: [{min: 4.5, score: 5}, {min: 4.0, score: 3}, {min: 0, score: 0}] },
      { id: "ai_review", label: "AI口コミ分析", category: "satisfaction", maxScore: 5, unit: "点", operator: ">=", isManualInput: true, thresholds: [{min: 80, score: 5}, {min: 50, score: 3}, {min: 0, score: 0}] },
      { id: "fix_rate", label: "お直し率", category: "tech_quality", maxScore: 5, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 1, score: 5}, {min: 3, score: 3}, {min: 100, score: 0}] },
      { id: "claim_rate", label: "クレーム率", category: "tech_quality", maxScore: 5, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 5}, {min: 1, score: 0}] },
      { id: "avg_treatment_time", label: "平均施術時間", category: "tech_quality", maxScore: 5, unit: "分", operator: "<=", isManualInput: true, thresholds: [{min: 60, score: 5}, {min: 90, score: 3}, {min: 120, score: 0}] },
      { id: "sns_posts", label: "SNS投稿数", category: "marketing", maxScore: 2, unit: "件", operator: ">=", isManualInput: true, thresholds: [{min: 15, score: 2}, {min: 5, score: 1}, {min: 0, score: 0}] },
      { id: "blog_posts", label: "ブログ投稿数", category: "marketing", maxScore: 3, unit: "件", operator: ">=", isManualInput: true, thresholds: [{min: 4, score: 3}, {min: 1, score: 1}, {min: 0, score: 0}] },
      { id: "late_count", label: "遅刻回数", category: "attendance", maxScore: -2, unit: "回", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 0}, {min: 1, score: -1}, {min: 3, score: -2}] },
      { id: "absence_count", label: "欠勤回数", category: "attendance", maxScore: -3, unit: "回", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 0}, {min: 1, score: -1}, {min: 3, score: -3}] }
    ],
    managerItems: [
      { id: "tech_speed", label: "技術習得スピード", category: "technical" },
      { id: "lesson_attitude", label: "レッスン参加姿勢", category: "technical" },
      { id: "counseling", label: "カウンセリング力", category: "customer_service" },
      { id: "report", label: "報連相", category: "team_contribution" },
      { id: "cooperation", label: "協力性", category: "team_contribution" },
      { id: "marketing_proactivity", label: "集客への主体性", category: "company_contribution" },
      { id: "inventory", label: "在庫管理", category: "operations" },
      { id: "rules", label: "店舗ルール順守", category: "operations" }
    ]
  },
  educator: {
    id: "template_educator",
    role: "educator",
    roleName: "教育担当",
    managerMaxScore: 30,
    autoItems: [
      { id: "sales_target_ratio", label: "売上目標達成率", category: "sales", maxScore: 15, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 100, score: 15}, {min: 80, score: 8}, {min: 0, score: 0}] },
      { id: "unit_price", label: "客単価", category: "sales", maxScore: 5, unit: "円", operator: ">=", isManualInput: false, thresholds: [{min: 8500, score: 5}, {min: 6500, score: 3}, {min: 0, score: 0}] },
      { id: "next_booking_rate", label: "次回予約率", category: "repeat", maxScore: 10, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 65, score: 10}, {min: 45, score: 5}, {min: 0, score: 0}] },
      { id: "nomination_count", label: "指名数", category: "repeat", maxScore: 5, unit: "件", operator: ">=", isManualInput: false, thresholds: [{min: 40, score: 5}, {min: 20, score: 3}, {min: 0, score: 0}] },
      { id: "review_score", label: "口コミ評価", category: "satisfaction", maxScore: 10, unit: "点", operator: ">=", isManualInput: true, thresholds: [{min: 4.6, score: 10}, {min: 4.2, score: 5}, {min: 0, score: 0}] },
      { id: "fix_rate", label: "お直し率", category: "tech_quality", maxScore: 10, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 0.5, score: 10}, {min: 2, score: 5}, {min: 100, score: 0}] },
      { id: "claim_rate", label: "クレーム率", category: "tech_quality", maxScore: 5, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 5}, {min: 1, score: 0}] },
      { id: "training_hours", label: "教育稼働時間", category: "team_contribution", maxScore: 10, unit: "時間", operator: ">=", isManualInput: true, thresholds: [{min: 20, score: 10}, {min: 10, score: 5}, {min: 0, score: 0}] }
    ],
    managerItems: [
      { id: "mentoring", label: "後輩への技術指導", category: "technical" },
      { id: "training_quality", label: "教育カリキュラム進行", category: "team_contribution" },
      { id: "counseling_model", label: "接客の模範姿勢", category: "customer_service" },
      { id: "improvement", label: "技術・接客の改善提案", category: "company_contribution" },
      { id: "cooperation", label: "チームワーク", category: "team_contribution" }
    ]
  },
  sub_manager: {
    id: "template_sub_manager",
    role: "sub_manager",
    roleName: "副店長",
    managerMaxScore: 30,
    autoItems: [
      { id: "store_sales_ratio", label: "店舗売上目標達成率", category: "sales", maxScore: 20, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 20}, {min: 90, score: 10}, {min: 0, score: 0}] },
      { id: "sales_target_ratio", label: "個人売上目標達成率", category: "sales", maxScore: 10, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 100, score: 10}, {min: 80, score: 5}, {min: 0, score: 0}] },
      { id: "next_booking_rate", label: "次回予約率", category: "repeat", maxScore: 10, unit: "%", operator: ">=", isManualInput: false, thresholds: [{min: 65, score: 10}, {min: 45, score: 5}, {min: 0, score: 0}] },
      { id: "store_review_score", label: "店舗口コミ平均", category: "satisfaction", maxScore: 10, unit: "点", operator: ">=", isManualInput: true, thresholds: [{min: 4.6, score: 10}, {min: 4.3, score: 5}, {min: 0, score: 0}] },
      { id: "store_fix_rate", label: "店舗全体のお直し率", category: "tech_quality", maxScore: 10, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 1, score: 10}, {min: 3, score: 5}, {min: 100, score: 0}] },
      { id: "sns_posts", label: "店舗SNS運用", category: "marketing", maxScore: 10, unit: "件", operator: ">=", isManualInput: true, thresholds: [{min: 30, score: 10}, {min: 15, score: 5}, {min: 0, score: 0}] }
    ],
    managerItems: [
      { id: "manager_support", label: "店長補佐・業務代行", category: "operations" },
      { id: "staff_motivation", label: "スタッフのモチベーション管理", category: "team_contribution" },
      { id: "problem_solving", label: "クレーム・トラブル対応", category: "customer_service" },
      { id: "inventory_management", label: "発注・在庫の最適化", category: "operations" },
      { id: "marketing_planning", label: "集客施策の提案", category: "company_contribution" }
    ]
  },
  manager: {
    id: "template_manager",
    role: "manager",
    roleName: "店長",
    managerMaxScore: 30,
    autoItems: [
      { id: "store_sales_ratio", label: "店舗売上目標達成率", category: "sales", maxScore: 25, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 25}, {min: 90, score: 15}, {min: 0, score: 0}] },
      { id: "store_profit_ratio", label: "店舗利益目標達成率", category: "sales", maxScore: 15, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 15}, {min: 90, score: 8}, {min: 0, score: 0}] },
      { id: "store_review_score", label: "店舗口コミ平均", category: "satisfaction", maxScore: 10, unit: "点", operator: ">=", isManualInput: true, thresholds: [{min: 4.7, score: 10}, {min: 4.4, score: 5}, {min: 0, score: 0}] },
      { id: "store_retention", label: "店舗定着率（リピート）", category: "repeat", maxScore: 10, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 50, score: 10}, {min: 40, score: 5}, {min: 0, score: 0}] },
      { id: "staff_turnover", label: "スタッフ離職率", category: "operations", maxScore: 10, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 10}, {min: 5, score: 5}, {min: 100, score: 0}] }
    ],
    managerItems: [
      { id: "leadership", label: "リーダーシップ・統率力", category: "team_contribution" },
      { id: "numeral_management", label: "計数管理（売上・経費・利益）", category: "operations" },
      { id: "staff_development", label: "スタッフ育成・評価", category: "team_contribution" },
      { id: "store_marketing", label: "店舗集客戦略の立案・実行", category: "marketing" },
      { id: "compliance", label: "コンプライアンス・労務管理", category: "operations" }
    ]
  },
  area_manager: {
    id: "template_area_manager",
    role: "area_manager",
    roleName: "エリアマネージャー",
    managerMaxScore: 30,
    autoItems: [
      { id: "area_sales_ratio", label: "エリア売上目標達成率", category: "sales", maxScore: 30, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 30}, {min: 90, score: 15}, {min: 0, score: 0}] },
      { id: "area_profit_ratio", label: "エリア利益目標達成率", category: "sales", maxScore: 20, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 20}, {min: 90, score: 10}, {min: 0, score: 0}] },
      { id: "manager_turnover", label: "店長離職率", category: "operations", maxScore: 10, unit: "%", operator: "<=", isManualInput: true, thresholds: [{min: 0, score: 10}, {min: 10, score: 5}, {min: 100, score: 0}] },
      { id: "new_store_launch", label: "新店舗立ち上げ成功率", category: "company_contribution", maxScore: 10, unit: "%", operator: ">=", isManualInput: true, thresholds: [{min: 100, score: 10}, {min: 50, score: 5}, {min: 0, score: 0}] }
    ],
    managerItems: [
      { id: "strategic_planning", label: "エリア戦略の立案・実行", category: "company_contribution" },
      { id: "manager_development", label: "店長育成・マネジメント力", category: "team_contribution" },
      { id: "risk_management", label: "リスクマネジメント・危機対応", category: "operations" },
      { id: "new_business", label: "新規施策・全社横断プロジェクト推進", category: "company_contribution" }
    ]
  }
};

export function calculateDynamicScore(template: EvaluationTemplate, autoMetrics: Record<string, number>, managerRaw: Record<string, number>) {
  let auto_total = 0;
  const auto_scores: Record<string, number> = {};
  
  template.autoItems.forEach(item => {
    const val = autoMetrics[item.id] || 0;
    let earned = 0;
    
    // Sort thresholds depending on operator
    const sorted = [...item.thresholds];
    if (item.operator === ">=") {
      sorted.sort((a, b) => b.min - a.min); // highest first
      const match = sorted.find(t => val >= t.min);
      if (match) earned = match.score;
    } else {
      sorted.sort((a, b) => a.min - b.min); // lowest first
      const match = sorted.find(t => val <= t.min);
      if (match) earned = match.score;
    }
    
    auto_scores[item.id] = earned;
    auto_total += earned;
  });

  // Calculate manager score
  // Total possible raw is 5 * number of valid items (0 means N/A)
  let rawSum = 0;
  let validItemsCount = 0;
  template.managerItems.forEach(item => {
    const val = managerRaw[item.id];
    if (val !== undefined && val !== 0) {
      rawSum += val;
      validItemsCount++;
    }
  });
  
  const maxPossibleRaw = validItemsCount * 5;
  const manager_total = maxPossibleRaw > 0 ? Math.round((rawSum / maxPossibleRaw) * template.managerMaxScore * 10) / 10 : 0;
  const total = Math.round((auto_total + manager_total) * 10) / 10;
  
  let rank: EvaluationRank = "D";
  if (total >= 90) rank = "S";
  else if (total >= 80) rank = "A";
  else if (total >= 70) rank = "B";
  else if (total >= 60) rank = "C";

  return {
    auto_scores,
    calculated_scores: {
      auto_total,
      manager_total,
      total
    },
    rank
  };
}

export const EVALUATION_CATEGORIES_JP: Record<string, string> = {
  sales: "売上",
  repeat: "リピート",
  satisfaction: "顧客満足",
  tech_quality: "技術品質",
  marketing: "集客",
  attendance: "勤怠",
  technical: "技術",
  customer_service: "接客",
  team_contribution: "チーム貢献",
  company_contribution: "会社貢献",
  operations: "運営"
};
