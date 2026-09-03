import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePayrollTaxesCore } from "@/lib/payroll-core";

type PayrollContext = Parameters<typeof calculatePayrollTaxesCore>[0];

function createContext(overrides: Partial<PayrollContext> = {}): PayrollContext {
  return {
    taxable_base_for_income_tax: 300_000,
    employment_insurance_wages: 300_000,
    health_insurance_standard_monthly_remuneration: 250_050,
    pension_standard_monthly_remuneration: 250_050,
    care_insurance_applicable: false,
    income_tax_history: {
      withholding_tax_category: "甲欄",
      dependents_count_for_withholding: 0,
    } as PayrollContext["income_tax_history"],
    income_tax_row: {
      kou_amounts: { "0": 5_000, "1": 4_000, "2": 3_000, "3": 2_000, "4": 1_000, "5": 0, "6": 0, "7": 40_000 },
      otsu_amount: 18_000,
      excess_dependents_rule: { applies_over: 7, deduction_per_person: 2_000 },
    } as PayrollContext["income_tax_row"],
    ...overrides,
  };
}

describe("calculatePayrollTaxesCore", () => {
  it("uses official amounts before rate-based calculations", () => {
    const result = calculatePayrollTaxesCore(createContext({
      official_health_table: { employee_health_amount: 14_000 } as PayrollContext["official_health_table"],
      health_rate_master: { employee_rate: 0.0506, rounding_rule: "official_amount_table" } as PayrollContext["health_rate_master"],
    }));

    assert.equal(result.health_insurance, 14_000);
    assert.equal(result.sources.health, "official_amount_table");
  });

  it("calculates and rounds insurance from configured rates", () => {
    const result = calculatePayrollTaxesCore(createContext({
      health_rate_master: { employee_rate: 0.0506, rounding_rule: "official_amount_table" } as PayrollContext["health_rate_master"],
      employment_rate_master: { employee_rate: 0.006, rounding_rule: "floor" } as PayrollContext["employment_rate_master"],
    }));

    assert.equal(result.health_insurance, 12_653);
    assert.equal(result.employment_insurance, 1_800);
    assert.equal(result.total_social_insurances, 14_453);
    assert.equal(result.sources.health, "rate_calculation");
  });

  it("does not charge care insurance when the employee is not applicable", () => {
    const result = calculatePayrollTaxesCore(createContext({
      care_insurance_applicable: false,
      care_rate_master: { employee_rate: 0.008, rounding_rule: "round_half_up" } as PayrollContext["care_rate_master"],
    }));

    assert.equal(result.care_insurance, 0);
  });

  it("applies the excess-dependent deduction for category A withholding", () => {
    const result = calculatePayrollTaxesCore(createContext({
      taxable_base_for_income_tax: 800_000,
      income_tax_history: {
        withholding_tax_category: "甲欄",
        dependents_count_for_withholding: 9,
      } as PayrollContext["income_tax_history"],
    }));

    assert.equal(result.income_tax, 36_000);
  });

  it("uses the category B withholding amount", () => {
    const result = calculatePayrollTaxesCore(createContext({
      income_tax_history: {
        withholding_tax_category: "乙欄",
        dependents_count_for_withholding: 0,
      } as PayrollContext["income_tax_history"],
    }));

    assert.equal(result.income_tax, 18_000);
  });
});
