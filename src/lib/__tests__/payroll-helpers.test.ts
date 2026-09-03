import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { determineCareInsuranceStatus } from "@/lib/payroll-helpers";

describe("determineCareInsuranceStatus", () => {
  const cases: Array<[string, string, boolean]> = [
    ["1986-04-01T00:00:00.000Z", "2026-02", false],
    ["1986-04-01T00:00:00.000Z", "2026-03", true],
    ["1986-04-02T00:00:00.000Z", "2026-03", false],
    ["1986-04-02T00:00:00.000Z", "2026-04", true],
    ["1961-04-01T00:00:00.000Z", "2026-02", true],
    ["1961-04-01T00:00:00.000Z", "2026-03", false],
  ];

  for (const [birthDate, month, expected] of cases) {
    it(`evaluates the month boundary for birth date ${birthDate} in ${month}`, () => {
      const result = determineCareInsuranceStatus({
        dateOfBirth: new Date(birthDate),
        insuranceTargetMonth: month,
      });

      assert.equal(result.care_insurance_result, expected);
      assert.equal(result.care_insurance_override_applied, false);
    });
  }
});
