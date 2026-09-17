import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTaxExclusiveProductCommission, normalizeProductStoreLabel } from "@/lib/product-commission";

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

describe("normalizeProductStoreLabel", () => {
  it("maps Jasmine Lash store-name variants to the allowance display labels", () => {
    assert.equal(normalizeProductStoreLabel("Jasmine Lash 六甲道店"), "六甲");
    assert.equal(normalizeProductStoreLabel("Jasmine Lash 神戸店"), "神戸");
    assert.equal(normalizeProductStoreLabel("BROW GYM 元町店"), "元町");
  });

  it("keeps an external tenant store name unchanged", () => {
    assert.equal(normalizeProductStoreLabel("Salon 表参道店"), "Salon 表参道店");
  });
});
