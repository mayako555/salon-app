import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTaxExclusiveProductCommission } from "@/lib/product-commission";

describe("calculateTaxExclusiveProductCommission", () => {
  it("calculates 10% after converting tax-inclusive sales to tax-exclusive sales", () => {
    assert.deepEqual(calculateTaxExclusiveProductCommission(11_000, 10), {
      taxExclusiveSales: 10_000,
      commission: 1_000,
    });
  });

  it("rounds down fractional yen consistently", () => {
    assert.deepEqual(calculateTaxExclusiveProductCommission(1_980, 10), {
      taxExclusiveSales: 1_800,
      commission: 180,
    });
  });

  it("does not produce negative allowances", () => {
    assert.deepEqual(calculateTaxExclusiveProductCommission(-1_000, 10), {
      taxExclusiveSales: 0,
      commission: 0,
    });
  });
});
