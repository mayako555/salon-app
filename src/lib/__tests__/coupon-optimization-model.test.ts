import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SalesRecord } from "../../types/sales";
import { aggregateWeeklyCouponObservations, buildCouponOptimizationModel } from "../coupon-optimization/model";
import { extractWordingCategories } from "../coupon-optimization/wording";

function sale(index: number, price: number, overrides: Partial<SalesRecord> = {}): SalesRecord {
  return {
    id: `sale-${index}-${price}`,
    staff_id: "staff", staff_name: "担当", store_name: "六甲道店",
    date: `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
    time: "10:00", customer_name: `顧客${index}`, customer_type: "新規",
    menu_course: "まつげパーマ", menu_category: "まつげパーマ",
    tech_sales: price, product_sales: 0, is_nominated: false, nomination_fee: 0,
    discount: 0, discount_reason: "", portal_fee: 0, hpb_points: 0,
    reservation_route: "ホットペッパー", payment_method: "未入力", hair_material: "",
    options: "", cancel_fee: 0, status: "closed", source: "hotpepper",
    companyId: "company-a", coupon_name: index % 2 === 0 ? "束感 美容液仕上げ" : "ナチュラル",
    created_at: null, ...overrides,
  };
}

describe("coupon optimization model", () => {
  it("maps synonym keywords to stable wording categories", () => {
    assert.deepEqual(extractWordingCategories("今だけ 自然な韓国風束感 美容液仕上げ"), [
      "value_appeal", "natural", "bundle_style", "serum_finish",
    ]);
  });

  it("aggregates only the requested tenant, store and menu", () => {
    const sales = [sale(0, 5_000), sale(1, 5_000), sale(2, 5_000, { companyId: "company-b" }), sale(3, 5_000, { store_name: "神戸店" })];
    const observations = aggregateWeeklyCouponObservations(sales, "company-a", "六甲道店", "まつげパーマ");
    assert.equal(observations.reduce((sum, item) => sum + item.reservations, 0), 2);
  });

  it("withholds recommendations when readiness requirements are not met", () => {
    const model = buildCouponOptimizationModel([sale(0, 5_000)], "company-a", "六甲道店", "まつげパーマ");
    assert.equal(model.confidence, "INSUFFICIENT");
    assert.equal(model.revenueOptimalPrice, null);
    assert.deepEqual(model.simulation, []);
  });

  it("fits an isolated price model and returns a bounded revenue simulation", () => {
    const sales: SalesRecord[] = [];
    let index = 0;
    for (const price of [4_000, 5_000, 6_000]) {
      const count = price === 4_000 ? 18 : price === 5_000 ? 12 : 7;
      for (let occurrence = 0; occurrence < count; occurrence += 1) {
        sales.push(sale(index, price, { coupon_name: occurrence % 2 ? "束感" : "ナチュラル" }));
        index += 1;
      }
    }
    const model = buildCouponOptimizationModel(sales, "company-a", "六甲道店", "まつげパーマ", {
      minimumReservations: 20,
      minimumWeeks: 1,
      minimumPriceVariations: 3,
      minimumWordingSamples: 100,
      priceStep: 100,
    });
    assert.ok(model.coefficients.some((item) => item.name === "price_per_1000"));
    assert.ok(model.simulation.length > 0);
    assert.ok(model.revenueOptimalPrice !== null);
    assert.ok(model.revenueOptimalPrice! >= 4_000 && model.revenueOptimalPrice! <= 6_000);
    assert.equal(model.companyId, "company-a");
  });
});
