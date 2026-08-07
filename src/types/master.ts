export type SalesMasterItem = {
  id?: string;
  companyId?: string;
  store: string;
  itemType: "menu" | "coupon" | "messageCoupon" | "option" | "discount" | "fee" | "karteTemplate" | "product" | "reservationRoute" | "paymentMethod" | "store";
  majorCategory?: string; // 施術、店販、割引・サービス、オプションなど
  category: string;
  name: string;
  internalName?: string;
  price: number;
  imageUrl?: string;
  duration?: string; // 所要時間
  openTime?: string; // 営業時間(開始)
  closeTime?: string; // 営業時間(終了)
  hpbName?: string;  // HPBクーポン名
  restrictions?: string; // 制約
  notes?: string; // その他
  isActive: boolean;
  staffAssignable?: boolean;
  equipmentAssignable?: boolean;
  sortOrder?: number;
  trackInventory?: boolean;
  lineOaId?: string; // 追加: LINE公式アカウントID
  liffId?: string; // 追加: LIFF ID
  created_at?: any;
  updated_at?: any;
};

export type AttendancePolicy = {
  roundingEnabled: boolean;
  roundingIntervalMinutes: number;
  linkWithShifts?: boolean;
};

export type FeatureKey =
  | "sales"           // 売上管理
  | "customers"       // 顧客管理（カルテ）
  | "reservations"    // 予約管理
  | "attendance"      // 勤怠管理
  | "shifts"          // シフト管理
  | "payroll"         // 給与計算
  | "expenses"        // 経費管理
  | "cash_management" // 資金管理・レジ金
  | "inventory"       // 在庫管理
  | "goals"           // 目標管理
  | "evaluations"     // 人事評価
  | "training"        // 研修・マニュアル
  | "school"          // スクール管理
  | "line_automation" // LINE連携・自動化
  | "ai_assistant"    // AIアシスタント
  | "exports"         // データエクスポート
  | "tasks";          // タスク管理

export type FeatureSettings = Partial<Record<FeatureKey, boolean>>;

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  defaultForSystemOwner: boolean;
  defaultForGeneral: boolean;
  requires: FeatureKey[];
  optional?: FeatureKey[];
}

export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  sales: { key: "sales", label: "売上管理", description: "売上データの登録・管理", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
  customers: { key: "customers", label: "顧客管理", description: "顧客カルテ・履歴管理", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
  reservations: { key: "reservations", label: "予約管理", description: "予約・シフト連動カレンダー", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
  attendance: { key: "attendance", label: "勤怠管理", description: "打刻・出退勤管理", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
  shifts: { key: "shifts", label: "シフト管理", description: "スタッフシフト管理", defaultForSystemOwner: true, defaultForGeneral: true, requires: ["attendance"] },
  payroll: { key: "payroll", label: "給与計算", description: "勤怠連動給与計算", defaultForSystemOwner: true, defaultForGeneral: false, requires: ["attendance"], optional: ["sales"] },
  expenses: { key: "expenses", label: "経費管理", description: "経費精算・承認", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
  cash_management: { key: "cash_management", label: "資金管理", description: "レジ金・店舗間移動", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  inventory: { key: "inventory", label: "在庫管理", description: "店販商品・備品在庫", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  goals: { key: "goals", label: "目標管理", description: "売上・指名目標管理", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  evaluations: { key: "evaluations", label: "人事評価", description: "スタッフ評価・スキル", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  training: { key: "training", label: "研修管理", description: "マニュアル・テスト", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  school: { key: "school", label: "スクール", description: "スクール受講生管理", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  line_automation: { key: "line_automation", label: "LINE自動化", description: "サンクス・リマインド自動送信", defaultForSystemOwner: true, defaultForGeneral: false, requires: ["customers"], optional: ["reservations"] },
  ai_assistant: { key: "ai_assistant", label: "AI機能", description: "AIテキスト生成・カルテ要約", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  exports: { key: "exports", label: "データ出力", description: "CSV・Excel出力機能", defaultForSystemOwner: true, defaultForGeneral: false, requires: [] },
  tasks: { key: "tasks", label: "タスク管理", description: "店舗間・個人タスク管理", defaultForSystemOwner: true, defaultForGeneral: true, requires: [] },
};

/**
 * 会社タイプに応じて、デフォルトのフィーチャー設定を生成します
 */
export function generateDefaultFeatures(isSystemOwner: boolean): FeatureSettings {
  const features: FeatureSettings = {};
  for (const key of Object.keys(FEATURE_DEFINITIONS) as FeatureKey[]) {
    const def = FEATURE_DEFINITIONS[key];
    features[key] = isSystemOwner ? def.defaultForSystemOwner : def.defaultForGeneral;
  }
  return features;
}

/**
 * 既存の設定がある場合はそれを優先し、未設定（undefined）の項目のみデフォルト値を埋めます
 * 意図的にfalseが設定されている場合は、そのままfalseを維持します
 */
export function ensureFeatureDefaults(currentFeatures: FeatureSettings | undefined, isSystemOwner: boolean): FeatureSettings {
  const defaults = generateDefaultFeatures(isSystemOwner);
  if (!currentFeatures) {
    return defaults;
  }

  const merged: FeatureSettings = { ...currentFeatures };
  for (const key of Object.keys(FEATURE_DEFINITIONS) as FeatureKey[]) {
    if (merged[key] === undefined) {
      merged[key] = defaults[key];
    }
  }
  return merged;
}

// FEATURE_DEPENDENCIES is now replaced by FEATURE_DEFINITIONS[key].requires
// Kept for backward compatibility if any old code uses it directly, but ideally remove
export const FEATURE_DEPENDENCIES: Record<FeatureKey, { requires: FeatureKey[], optional?: FeatureKey[] }> = {
  sales: { requires: [] },
  customers: { requires: [] },
  reservations: { requires: [] },
  attendance: { requires: [] },
  shifts: { requires: ["attendance"] },
  payroll: { requires: ["attendance"], optional: ["sales"] },
  expenses: { requires: [] },
  cash_management: { requires: [] },
  inventory: { requires: [] },
  goals: { requires: [] },
  evaluations: { requires: [] },
  training: { requires: [] },
  school: { requires: [] },
  line_automation: { requires: ["customers"], optional: ["reservations"] },
  ai_assistant: { requires: [] },
  exports: { requires: [] },
  tasks: { requires: [] },
};

export type CompanyInfo = {
  id?: string;
  name?: string;
  planId?: string; // 料金プラン
  schoolEnabled?: boolean;
  schoolName?: string;
  companyType?: "system_owner" | "franchise";
  attendancePolicy?: AttendancePolicy;
  features?: FeatureSettings;
};
