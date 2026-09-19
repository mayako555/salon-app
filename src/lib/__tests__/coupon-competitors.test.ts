import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterCompetitorPriceHistory,
  summarizeCompetitorPrices,
  type CompetitorPriceRecord,
} from "../coupon-optimization/competitors";

const record = (overrides: Partial<CompetitorPriceRecord> = {}): CompetitorPriceRecord => ({
  id: "a",
  companyId: "company-a",
  storeName: "六甲道店",
  menuCategory: "まつげパーマ",
  competitorName: "競合A",
  area: "六甲道",
  price: 5_000,
  capturedAt: "2026-08-01",
  sourceType: "manual",
  ...overrides,
});

describe("competitor price history", () => {
  it("strictly filters tenant, store and menu", () => {
    const records = [
      record(),
      record({ id: "other-company", companyId: "company-b" }),
      record({ id: "other-store", storeName: "神戸店" }),
      record({ id: "other-menu", menuCategory: "エクステ" }),
    ];
    assert.deepEqual(filterCompetitorPriceHistory(records, "company-a", "六甲道店", "まつげパーマ").map((item) => item.id), ["a"]);
  });

  it("uses the latest price per competitor and keeps history intact", () => {
    const records = [
      record({ id: "old-a", price: 4_800, capturedAt: "2026-07-01" }),
      record({ id: "new-a", price: 5_200, capturedAt: "2026-08-01" }),
      record({ id: "b", competitorName: "競合B", price: 5_800, capturedAt: "2026-08-05" }),
    ];
    const summary = summarizeCompetitorPrices(records, "六甲道", 6_050);
    assert.equal(records.length, 3);
    assert.deepEqual(summary.latestPrices.map((item) => item.id), ["new-a", "b"]);
    assert.equal(summary.medianPrice, 5_500);
    assert.equal(summary.relativePriceRatio, 1.1);
    assert.ok(Math.abs((summary.differencePercent || 0) - 10) < 1e-9);
  });

  it("can calculate a historical as-of median", () => {
    const records = [
      record({ id: "old-a", price: 4_800, capturedAt: "2026-07-01" }),
      record({ id: "new-a", price: 5_200, capturedAt: "2026-08-01" }),
      record({ id: "b", competitorName: "競合B", price: 5_600, capturedAt: "2026-07-10" }),
    ];
    const summary = summarizeCompetitorPrices(records, "六甲道", 5_000, "2026-07-31");
    assert.equal(summary.medianPrice, 5_200);
  });

  it("does not mix trade areas", () => {
    const records = [record(), record({ id: "sannomiya", area: "三宮", price: 9_000 })];
    assert.equal(summarizeCompetitorPrices(records, "六甲道", 5_000).medianPrice, 5_000);
  });
});
