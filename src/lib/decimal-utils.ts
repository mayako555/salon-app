import Decimal from "decimal.js";
import { RoundingRule } from "@/types/payroll";

// Set precision for Decimal to avoid default 20 digits if we want to change it.
// Default is usually fine for money calculations.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Perform fractional handling based on the rule.
 */
export function applyRounding(amount: Decimal | number | string, rule: RoundingRule): Decimal {
  const d = new Decimal(amount);
  
  switch (rule) {
    case "floor":
      return d.floor();
    case "ceil":
      return d.ceil();
    case "round_half_up":
      return d.round();
    case "round_half_down":
      // ROUND_HALF_DOWN is 4 in decimal.js
      return d.toDecimalPlaces(0, Decimal.ROUND_HALF_DOWN);
    case "official_amount_table":
      // Usually, official tables are pre-rounded. If we fall back here, we might just round half up.
      // E.g., for standard remuneration calculations falling back from exact table.
      // Standard Japanese payroll rounding is often "50 sen or less is dropped, 51 sen or more is rounded up"
      // Wait, 50 sen or less (<= 0.50) dropped means 0.50 -> 0. 0.51 -> 1.
      // Decimal.ROUND_HALF_DOWN means 0.5 -> 0, 0.51 -> 1. This matches exactly.
      return d.toDecimalPlaces(0, Decimal.ROUND_HALF_DOWN);
    default:
      return d.round();
  }
}

/**
 * Calculates insurance amount via rate multiplication.
 * @param basis The taxable/remuneration basis
 * @param rate The insurance rate (e.g. 0.0506 for 5.06%)
 * @param rule Rounding rule
 */
export function calculateByRate(basis: number | string, rate: number | string, rule: RoundingRule = "official_amount_table"): number {
  const dBasis = new Decimal(basis);
  const dRate = new Decimal(rate);
  const rawAmount = dBasis.mul(dRate);
  return applyRounding(rawAmount, rule).toNumber();
}

/**
 * Calculates employer/employee split if rate is a combined rate.
 * @param basis The taxable/remuneration basis
 * @param combinedRate The combined rate
 * @param splitRule "half" or custom split logic if needed.
 * @param roundingRule Rounding rule
 */
export function calculateSplit(
  basis: number | string, 
  combinedRate: number | string, 
  roundingRule: RoundingRule = "official_amount_table"
): { employee: number, employer: number, total: number } {
  const dBasis = new Decimal(basis);
  const dRate = new Decimal(combinedRate);
  
  const total = dBasis.mul(dRate);
  const half = total.div(2);
  
  // Standard split logic often applies rounding to the employee portion first.
  const employeeRounded = applyRounding(half, roundingRule);
  const employerRounded = applyRounding(total.minus(employeeRounded), roundingRule);
  const totalRounded = employeeRounded.plus(employerRounded);
  
  return {
    employee: employeeRounded.toNumber(),
    employer: employerRounded.toNumber(),
    total: totalRounded.toNumber()
  };
}

export { Decimal };
