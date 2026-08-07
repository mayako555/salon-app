import { calculatePayrollTaxesCore } from "./src/lib/payroll-core";
import { determineCareInsuranceStatus } from "./src/lib/payroll-helpers";
import { Timestamp } from "firebase/firestore";

let testsRun = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (!condition) {
    testsFailed++;
    console.error(`❌ FAIL: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runTests() {
  console.log("--- Starting Payroll Core Tests ---");

  // 1. Care Insurance Age Test
  // Reaches 40 on 2026-03-31 (Born 1986-04-01) -> Target month 2026-03 should be TRUE
  const dob1 = new Date("1986-04-01T00:00:00Z");
  const res1 = determineCareInsuranceStatus({ dateOfBirth: dob1, insuranceTargetMonth: "2026-03" });
  assert(res1.care_insurance_result === true, "Born 1986-04-01 -> 40 on 2026-03-31 -> Liable in 2026-03");

  const res2 = determineCareInsuranceStatus({ dateOfBirth: dob1, insuranceTargetMonth: "2026-02" });
  assert(res2.care_insurance_result === false, "Born 1986-04-01 -> 40 on 2026-03-31 -> NOT liable in 2026-02");

  // Reaches 40 on 2026-04-01 (Born 1986-04-02) -> Target month 2026-03 should be FALSE
  const dob2 = new Date("1986-04-02T00:00:00Z");
  const res3 = determineCareInsuranceStatus({ dateOfBirth: dob2, insuranceTargetMonth: "2026-03" });
  assert(res3.care_insurance_result === false, "Born 1986-04-02 -> 40 on 2026-04-01 -> NOT liable in 2026-03");

  const res4 = determineCareInsuranceStatus({ dateOfBirth: dob2, insuranceTargetMonth: "2026-04" });
  assert(res4.care_insurance_result === true, "Born 1986-04-02 -> 40 on 2026-04-01 -> Liable in 2026-04");

  // Reaches 65 test
  // Born 1961-04-01 -> Reaches 65 on 2026-03-31 -> Target month 2026-03 should be FALSE (liable UNTIL the month before reaching 65)
  // Wait, Japanese rule: "until the month before the month containing the day they reach 65".
  // So if they reach 65 in 2026-03, liable until 2026-02.
  const dob3 = new Date("1961-04-01T00:00:00Z");
  const res5 = determineCareInsuranceStatus({ dateOfBirth: dob3, insuranceTargetMonth: "2026-02" });
  assert(res5.care_insurance_result === true, "Born 1961-04-01 -> 65 on 2026-03-31 -> Liable in 2026-02");
  
  const res6 = determineCareInsuranceStatus({ dateOfBirth: dob3, insuranceTargetMonth: "2026-03" });
  assert(res6.care_insurance_result === false, "Born 1961-04-01 -> 65 on 2026-03-31 -> NOT liable in 2026-03");

  // 2. Floating Point / Decimal Precision Test
  // 5.06% of 250,000 = 12650 exactly
  // What if 5.06% of 250,050? = 12652.53 -> With standard float, could be 12652.529999999999.
  // With Decimal + ROUND_HALF_DOWN (Japanese 50sen or less dropped): 12652.53 -> 12653
  const coreCtx: any = {
    taxable_base_for_income_tax: 300000,
    employment_insurance_wages: 300000,
    health_insurance_standard_monthly_remuneration: 250050,
    pension_standard_monthly_remuneration: 250050,
    care_insurance_applicable: false,
    
    health_rate_master: {
      employee_rate: 0.0506, // 5.06%
      rounding_rule: "official_amount_table"
    },
    
    income_tax_history: {
      withholding_tax_category: "甲欄",
      dependents_count_for_withholding: 0
    },
    income_tax_row: {
      kou_amounts: { "0": 5000 }
    }
  };

  const result1 = calculatePayrollTaxesCore(coreCtx);
  assert(result1.health_insurance === 12653, `Decimal rate rounding: 250050 * 5.06% expected 12653, got ${result1.health_insurance}`);

  // 3. Income Tax Excess Rule
  const coreCtx2: any = {
    ...coreCtx,
    taxable_base_for_income_tax: 800000,
    health_rate_master: undefined,
    income_tax_history: {
      withholding_tax_category: "甲欄",
      dependents_count_for_withholding: 9
    },
    income_tax_row: {
      kou_amounts: { "7": 40000 },
      excess_dependents_rule: { deduction_per_person: 2000 }
    }
  };
  // Has 9 dependents. Cap at 7 => Base tax = 40000. Excess = (9 - 7) * 2000 = 4000. Final = 40000 - 4000 = 36000.
  const result2 = calculatePayrollTaxesCore(coreCtx2);
  assert(result2.income_tax === 36000, `Income tax excess dependents: expected 36000, got ${result2.income_tax}`);

  // 4. Official Table Match
  const coreCtx3: any = {
    ...coreCtx,
    official_health_table: {
      employee_health_amount: 14000
    }
  };
  const result3 = calculatePayrollTaxesCore(coreCtx3);
  assert(result3.health_insurance === 14000, `Official table precedence: expected 14000, got ${result3.health_insurance}`);

  console.log(`\n--- Test Summary: ${testsRun - testsFailed}/${testsRun} Passed ---`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
