import { Timestamp } from "firebase/firestore";

// --- Enums & Common Types ---

export type RoundingRule =
  | "official_amount_table"
  | "round_half_up"
  | "round_half_down"
  | "floor"
  | "ceil"
  | "custom";

export type RoundingStage =
  | "before_split"
  | "after_split"
  | "final_amount";

export type SocialInsuranceCollectionTiming =
  | "following_month"
  | "current_month";

export type MasterStatus = "draft" | "validated" | "active" | "inactive";

export type CalculationSource = "official_amount_table" | "rate_calculation";

// --- System Master Data (Tenant Independent) ---

export interface MasterIncomeTaxTable {
  id: string; // Document ID (e.g. 2026_monthly)
  year: number;
  table_type: "monthly" | "daily";
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  effective_from_month: number; // e.g. 202601
  effective_to_month: number | null;
  version: string;
  status: MasterStatus;
  row_count: number;
  source_name: string;
  source_file_name: string;
  source_file_hash: string;
  imported_at: Timestamp;
  imported_by: string;
}

export interface MasterIncomeTaxRow {
  id: string; // Subcollection row ID
  table_id: string;
  min_taxable_amount: number;
  max_taxable_amount: number | null; // null means "and above"
  kou_amounts: {
    "0": number;
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
    "6": number;
    "7": number;
  };
  excess_dependents_rule: {
    applies_over: number; // typically 7
    deduction_per_person: number;
  } | null;
  otsu_amount: number;
  hei_amount?: number; // Only for daily
  formula_type: string | null;
}

export interface MasterStandardRemunerationBracket {
  id: string;
  type: "health" | "pension";
  grade: number;
  min_amount: number;
  max_amount: number | null;
  standard_amount: number;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  status: MasterStatus;
  version: string;
}

export interface MasterHealthInsuranceRate {
  id: string;
  prefecture_code: string;
  insurer_type: string;
  total_rate: number;
  employee_rate: number;
  employer_rate: number;
  rounding_rule: RoundingRule;
  rounding_unit: number;
  rounding_stage: RoundingStage;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  effective_from_month: number;
  effective_to_month: number | null;
  status: MasterStatus;
  version: string;
}

export interface MasterPensionRate {
  id: string;
  total_rate: number;
  employee_rate: number;
  employer_rate: number;
  rounding_rule: RoundingRule;
  rounding_unit: number;
  rounding_stage: RoundingStage;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  status: MasterStatus;
  version: string;
}

export interface MasterCareInsuranceRate {
  id: string;
  total_rate: number;
  employee_rate: number;
  employer_rate: number;
  rounding_rule: RoundingRule;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  status: MasterStatus;
  version: string;
}

export interface MasterChildcareSupportRate {
  id: string;
  total_rate: number;
  employee_rate: number;
  employer_rate: number;
  rounding_rule: RoundingRule;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  status: MasterStatus;
  version: string;
}

export interface MasterEmploymentInsuranceRate {
  id: string;
  business_category: string;
  employee_rate: number;
  employer_unemployment_rate: number;
  employer_two_business_rate: number;
  total_rate: number;
  rounding_rule: RoundingRule;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  status: MasterStatus;
  version: string;
}

export interface OfficialAmountTable {
  id: string;
  type: "health" | "pension";
  grade: number;
  standard_monthly_remuneration: number;
  employee_health_amount?: number;
  employee_care_amount?: number;
  employee_childcare_support_amount?: number;
  employee_pension_amount?: number;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
}

// --- Tenant Data (Tenant Specific) ---

export type DecisionType = 
  | "qualification_acquisition" 
  | "regular_revision" 
  | "occasional_revision" 
  | "childcare_revision" 
  | "manual_registration";

export interface StaffSocialInsuranceHistory {
  id: string;
  tenant_id: string;
  staff_id: string;
  health_insurance_enrolled: boolean;
  pension_enrolled: boolean;
  health_insurance_standard_monthly_remuneration: number;
  pension_standard_monthly_remuneration: number;
  health_insurance_grade: number;
  pension_grade: number;
  effective_from: Timestamp; // Month precision in logic
  effective_to: Timestamp | null;
  effective_from_month: number;
  effective_to_month: number | null;
  decision_type: DecisionType;
  notification_date: Timestamp | null;
  source: string;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  updated_by: string;
}

export interface StaffEmploymentInsuranceHistory {
  id: string;
  tenant_id: string;
  staff_id: string;
  employment_insurance_enrolled: boolean;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  updated_by: string;
}

export interface StaffIncomeTaxHistory {
  id: string;
  tenant_id: string;
  staff_id: string;
  withholding_tax_category: "甲欄" | "乙欄";
  dependents_count_for_withholding: number;
  secondary_salary_declaration_submitted: boolean;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  declaration_submitted: boolean;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  updated_by: string;
}

export interface StaffResidentTaxSchedule {
  id: string;
  tenant_id: string;
  staff_id: string;
  municipality_name: string;
  tax_year: number;
  collection_start_month: string; // YYYY-MM
  collection_end_month: string; // YYYY-MM
  monthly_amounts: Record<string, number>; // Record of YYYY-MM to Amount
  annual_total: number;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  notification_date: Timestamp | null;
  notification_reference: string;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  updated_by: string;
}

export interface StaffCareInsuranceHistory {
  id: string;
  tenant_id: string;
  staff_id: string;
  date_of_birth: Timestamp;
  care_insurance_auto_result: boolean;
  care_insurance_override: boolean | null;
  override_reason: string;
  effective_from: Timestamp;
  effective_to: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  updated_by: string;
}

// --- Payroll Statement ---

export type StatementStatus = "draft" | "calculated" | "confirmed" | "paid" | "cancelled";

export interface PayrollItemSetting {
  taxable_for_income_tax: boolean;
  included_in_employment_insurance_wages: boolean;
  included_in_social_insurance_remuneration: boolean;
  is_commuting_allowance: boolean;
  non_taxable_limit_type: string;
}

export interface MonthlyStatementSnapshot {
  calculated_at: Timestamp;
  calculated_by: string;
  logic_version: string;
  inputs: any; // Raw inputs snapshot
  
  // Amounts breakdown
  commuting_allowance_total: number;
  commuting_allowance_non_taxable: number;
  commuting_allowance_taxable: number;
  
  employment_insurance_wages: number;
  social_insurance_remuneration_basis: number; // The actual standard remuneration used
  taxable_base_for_income_tax: number;
  
  // Masters used
  health_insurance_master_id: string;
  pension_master_id: string;
  care_insurance_master_id: string;
  employment_insurance_master_id: string;
  childcare_support_master_id: string;
  income_tax_table_master_id: string;
  resident_tax_schedule_id: string | null;

  // Exact parameters applied
  health_insurance_standard_monthly_remuneration: number;
  pension_standard_monthly_remuneration: number;
  health_insurance_grade: number;
  pension_grade: number;
  
  health_insurance_employee_rate: number;
  pension_employee_rate: number;
  care_insurance_employee_rate: number;
  childcare_support_employee_rate: number;
  employment_insurance_employee_rate: number;

  withholding_tax_category: "甲欄" | "乙欄";
  dependents_count_for_withholding: number;
  
  social_insurance_calculation_source: CalculationSource;
  rounding_methods_applied: any;
  income_tax_row_applied: any;
}

export interface MonthlyStatementV2 {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name: string;
  
  // Timing
  payroll_period_month: string; // YYYY-MM
  payment_date: Timestamp;
  payment_month: string; // YYYY-MM (Derived from payment_date)
  social_insurance_target_month: string; // YYYY-MM
  resident_tax_collection_month: string; // YYYY-MM

  type: "salary" | "reward";
  status: StatementStatus;
  
  // Financials
  base_amount: number;
  total_allowances: number;
  total_deductions: number;
  final_paid_amount: number;
  
  is_transferred?: boolean;
  work_location?: string;
  note?: string;
  
  adjustments?: {
    // legacy fields, plus:
    custom_adjustments?: { name: string; amount: number }[];
  };
  
  details: {
    base_tech_salary: number;
    base_product_salary: number;
    nomination_reward: number;
    transport_fee: number;
    cashless_deduction: number;
    tax_addition: number; 
    review_allowance?: number;
    blog_allowance?: number;
    executive_allowance?: number;
  };
  
  taxes: {
    health_insurance: number;
    pension: number;
    care_insurance: number;
    employment_insurance: number;
    childcare_support: number;
    income_tax: number;
    resident_tax: number;
    total_social_insurances: number;
  };
  
  snapshot?: MonthlyStatementSnapshot;
  
  created_at: Timestamp;
  updated_at: Timestamp;
}
