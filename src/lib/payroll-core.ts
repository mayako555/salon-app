import { Decimal, applyRounding, calculateByRate } from "./decimal-utils";
import { 
  MasterHealthInsuranceRate, 
  MasterPensionRate,
  MasterCareInsuranceRate,
  MasterEmploymentInsuranceRate,
  MasterChildcareSupportRate,
  MasterIncomeTaxRow,
  StaffIncomeTaxHistory,
  OfficialAmountTable,
  RoundingRule
} from "@/types/payroll";

interface PayrollCalculationContext {
  // WAGES
  taxable_base_for_income_tax: number; // Includes taxable commuting allowance, excludes non-taxable, excludes social insurances
  employment_insurance_wages: number; // Basically total gross wages
  
  // MASTERS
  health_rate_master?: MasterHealthInsuranceRate;
  pension_rate_master?: MasterPensionRate;
  care_rate_master?: MasterCareInsuranceRate;
  employment_rate_master?: MasterEmploymentInsuranceRate;
  childcare_rate_master?: MasterChildcareSupportRate;
  
  // OFFICIAL TABLES (Highest priority if present)
  official_health_table?: OfficialAmountTable;
  official_pension_table?: OfficialAmountTable;

  // STAFF STATE
  health_insurance_standard_monthly_remuneration: number;
  pension_standard_monthly_remuneration: number;
  care_insurance_applicable: boolean;
  
  income_tax_history: StaffIncomeTaxHistory;
  income_tax_row: MasterIncomeTaxRow;
}

export function calculatePayrollTaxesCore(ctx: PayrollCalculationContext) {
  let health_insurance = 0;
  let pension = 0;
  let care_insurance = 0;
  let employment_insurance = 0;
  let childcare_support = 0;
  let income_tax = 0;
  
  const sources = {
    health: "rate_calculation" as string,
    pension: "rate_calculation" as string,
    care: "rate_calculation" as string,
    childcare: "rate_calculation" as string
  };

  // 1. Health Insurance
  if (ctx.official_health_table && ctx.official_health_table.employee_health_amount !== undefined) {
    health_insurance = ctx.official_health_table.employee_health_amount;
    sources.health = "official_amount_table";
  } else if (ctx.health_rate_master) {
    health_insurance = calculateByRate(
      ctx.health_insurance_standard_monthly_remuneration, 
      ctx.health_rate_master.employee_rate, 
      ctx.health_rate_master.rounding_rule
    );
  }

  // 2. Pension
  if (ctx.official_pension_table && ctx.official_pension_table.employee_pension_amount !== undefined) {
    pension = ctx.official_pension_table.employee_pension_amount;
    sources.pension = "official_amount_table";
  } else if (ctx.pension_rate_master) {
    pension = calculateByRate(
      ctx.pension_standard_monthly_remuneration, 
      ctx.pension_rate_master.employee_rate, 
      ctx.pension_rate_master.rounding_rule
    );
  }

  // 3. Care Insurance
  if (ctx.care_insurance_applicable) {
    if (ctx.official_health_table && ctx.official_health_table.employee_care_amount !== undefined) {
      care_insurance = ctx.official_health_table.employee_care_amount;
      sources.care = "official_amount_table";
    } else if (ctx.care_rate_master) {
      care_insurance = calculateByRate(
        ctx.health_insurance_standard_monthly_remuneration, 
        ctx.care_rate_master.employee_rate, 
        ctx.care_rate_master.rounding_rule
      );
    }
  }

  // 4. Childcare Support (starts April 2026 typically)
  if (ctx.official_health_table && ctx.official_health_table.employee_childcare_support_amount !== undefined) {
    childcare_support = ctx.official_health_table.employee_childcare_support_amount;
    sources.childcare = "official_amount_table";
  } else if (ctx.childcare_rate_master) {
    childcare_support = calculateByRate(
      ctx.health_insurance_standard_monthly_remuneration, 
      ctx.childcare_rate_master.employee_rate, 
      ctx.childcare_rate_master.rounding_rule
    );
  }

  // 5. Employment Insurance
  if (ctx.employment_rate_master) {
    employment_insurance = calculateByRate(
      ctx.employment_insurance_wages, 
      ctx.employment_rate_master.employee_rate, 
      ctx.employment_rate_master.rounding_rule
    );
  }

  // 6. Income Tax
  // Social insurances sum to be deducted from taxable base
  const total_social_insurances = health_insurance + pension + care_insurance + childcare_support + employment_insurance;
  
  // Taxable Base = Taxable Wages - Total Social Insurances
  const final_taxable_base = new Decimal(ctx.taxable_base_for_income_tax).minus(total_social_insurances).toNumber();

  if (final_taxable_base > 0) {
    const taxHistory = ctx.income_tax_history;
    const taxRow = ctx.income_tax_row;
    
    // Ensure the final_taxable_base fits the row (Double check for exact match logic handled by caller)
    if (taxHistory.withholding_tax_category === "甲欄") {
      let dependents = taxHistory.dependents_count_for_withholding;
      
      // Handle excess dependents if applicable
      let excess_deduction = 0;
      if (dependents > 7 && taxRow.excess_dependents_rule) {
         // E.g., over 7 people, deduct a certain amount per person
         excess_deduction = (dependents - 7) * taxRow.excess_dependents_rule.deduction_per_person;
         dependents = 7; // Cap at 7 for table lookup
      }

      // Convert dependents to string key (0-7)
      const depKey = String(dependents > 7 ? 7 : Math.max(0, dependents)) as "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7";
      let baseTax = taxRow.kou_amounts[depKey] || 0;
      
      income_tax = Math.max(0, baseTax - excess_deduction);
      
    } else if (taxHistory.withholding_tax_category === "乙欄") {
      income_tax = taxRow.otsu_amount || 0;
    }
  }

  return {
    health_insurance,
    pension,
    care_insurance,
    employment_insurance,
    childcare_support,
    income_tax,
    total_social_insurances,
    sources
  };
}
