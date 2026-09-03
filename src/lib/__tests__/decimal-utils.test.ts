import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyRounding, calculateByRate, calculateSplit } from "@/lib/decimal-utils";

describe("decimal payroll calculations", () => {
  it("applies each supported rounding rule at the half-yen boundary", () => {
    assert.equal(applyRounding("100.5", "floor").toNumber(), 100);
    assert.equal(applyRounding("100.1", "ceil").toNumber(), 101);
    assert.equal(applyRounding("100.5", "round_half_up").toNumber(), 101);
    assert.equal(applyRounding("100.5", "round_half_down").toNumber(), 100);
    assert.equal(applyRounding("100.5", "official_amount_table").toNumber(), 100);
    assert.equal(applyRounding("100.51", "official_amount_table").toNumber(), 101);
  });

  it("calculates rates without binary floating-point drift", () => {
    assert.equal(calculateByRate(250_050, 0.0506), 12_653);
  });

  it("keeps the employee and employer split equal to its returned total", () => {
    const result = calculateSplit(250_050, 0.1012);

    assert.equal(result.employee + result.employer, result.total);
    assert.deepEqual(result, { employee: 12_653, employer: 12_652, total: 25_305 });
  });
});
