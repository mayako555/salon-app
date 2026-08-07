import { Timestamp } from "firebase/firestore";
import { StaffCareInsuranceHistory } from "@/types/payroll";

interface CareInsuranceContext {
  dateOfBirth: Date | Timestamp;
  insuranceTargetMonth: string; // YYYY-MM
  overrideHistory?: StaffCareInsuranceHistory;
}

/**
 * Determines Care Insurance applicability based on strict age rules:
 * In Japan, age increases on the day BEFORE the birthday.
 * A person is liable for Care Insurance from the month containing the day they reach 40 years old,
 * until the month before the month containing the day they reach 65 years old.
 * 
 * E.g., Born 1986-04-01 -> Reaches 40 on 2026-03-31 -> Target month is 2026-03.
 * Born 1986-04-02 -> Reaches 40 on 2026-04-01 -> Target month is 2026-04.
 */
export function determineCareInsuranceStatus(ctx: CareInsuranceContext): {
  care_insurance_result: boolean;
  care_insurance_reason: string;
  care_insurance_override_applied: boolean;
} {
  // If an override is active, use it regardless of age.
  if (ctx.overrideHistory && ctx.overrideHistory.care_insurance_override !== null) {
    return {
      care_insurance_result: ctx.overrideHistory.care_insurance_override,
      care_insurance_reason: `Manual override: ${ctx.overrideHistory.override_reason}`,
      care_insurance_override_applied: true,
    };
  }

  const dob = ctx.dateOfBirth instanceof Timestamp ? ctx.dateOfBirth.toDate() : ctx.dateOfBirth;
  
  // Date of reaching 40
  const age40Date = new Date(dob.getFullYear() + 40, dob.getMonth(), dob.getDate() - 1);
  // Date of reaching 65
  const age65Date = new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate() - 1);

  const targetParts = ctx.insuranceTargetMonth.split("-");
  const targetYear = parseInt(targetParts[0]);
  const targetMonth = parseInt(targetParts[1]); // 1-12

  // We consider the target month against the month they reach 40 and 65
  // Reaches 40 month:
  const reach40Year = age40Date.getFullYear();
  const reach40Month = age40Date.getMonth() + 1;

  // Reaches 65 month:
  const reach65Year = age65Date.getFullYear();
  const reach65Month = age65Date.getMonth() + 1;

  const targetValue = targetYear * 100 + targetMonth;
  const reach40Value = reach40Year * 100 + reach40Month;
  const reach65Value = reach65Year * 100 + reach65Month;

  if (targetValue < reach40Value) {
    return {
      care_insurance_result: false,
      care_insurance_reason: `Under 40 (Reaches 40 on ${age40Date.toISOString().split('T')[0]})`,
      care_insurance_override_applied: false
    };
  }

  if (targetValue >= reach65Value) {
    return {
      care_insurance_result: false,
      care_insurance_reason: `65 or older (Reached 65 on ${age65Date.toISOString().split('T')[0]})`,
      care_insurance_override_applied: false
    };
  }

  return {
    care_insurance_result: true,
    care_insurance_reason: `Age between 40 and 64 (target: ${ctx.insuranceTargetMonth})`,
    care_insurance_override_applied: false
  };
}
