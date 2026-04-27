export type StaffContract = {
  id: string;
  staff_id: string;
  staff_name?: string;
  contract_type: "outsourcing" | "hourly" | "monthly" | "tier_monthly";
  grade?: string; // 等級 (J1, P2, etc.)
  job_title?: string; // 役職/ランク名
  hourly_wage: number;
  monthly_base_salary: number;
  business_allowance?: number; // 業務手当
  attendance_allowance?: number; // 皆勤手当
  service_year_allowance?: number; // 勤務年数手当
  tech_sales_quota: number;
  tech_sales_ratio: number;
  tech_sales_threshold?: number; // 歩合発生しきい値 (例: 500,000)
  product_sales_ratio: number;
  nomination_fee: number;
  transport_fee_limit: number;
  deduction_consumption_tax: boolean;
  deduction_cashless_ratio: number;
  deduction_minimo_fee: boolean;
  deduction_rakuten_fee: boolean;
  deduction_nailie_fee: boolean;
  deduction_nomination_fee: boolean;
  valid_from: string;
  valid_to: string | null;
  custom_allowances?: { name: string; amount: number }[];
  created_at?: any;
};

// SALARY_GRADES は Firestore から取得するため削除しました。
// 取得には @/app/admin/salary-grades/actions の getSalaryGrades() を使用してください。
