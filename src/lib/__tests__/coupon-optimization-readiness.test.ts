import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessCouponAnalysisReadiness } from "../coupon-optimization/readiness";
import type { SalesRecord } from "../../types/sales";

function sale(overrides: Partial<SalesRecord> = {}): SalesRecord {
  return {
    id: "sale",
    staff_id: "staff",
    staff_name: "担当",
    store_name: "六甲道店",
    date: "2026-01-01",
    time: "10:00",
    customer_name: "顧客",
    customer_type: "新規",
    menu_course: "まつげパーマ",
    menu_category: "まつげパーマ",
    tech_sales: 5_000,
    product_sales: 0,
    is_nominated: false,
    nomination_fee: 0,
    discount: 0,
    discount_reason: "",
    portal_fee: 0,
    hpb_points: 0,
    reservation_route: "ホットペッパー",
    payment_method: "未入力",
    hair_material: "",
    options: "",
    cancel_fee: 0,
    status: "closed",
    source: "hotpepper",
    companyId: "company-a",
    created_at: null,
    ...overrides,
  };
}

describe("coupon optimization readiness", () => {
  it("does not produce a price recommendation when price variation is insufficient", () => {
    const sales = Array.from({ length: 12 }, (_, index) => sale({
      id: `sale-${index}`,
      date: `2026-${String(index + 1).padStart(2, "0")}-01`,
      coupon_name: "人気No.1",
    }));
    const [result] = assessCouponAnalysisReadiness(sales, "company-a", {
      minimumReservations: 10,
      minimumWeeks: 10,
      minimumPriceVariations: 3,
      minimumWordingSamples: 10,
    });

    assert.equal(result.canEstimatePrice, false);
    assert.equal(result.confidence, "INSUFFICIENT");
    assert.ok(result.warnings.includes("価格の種類が不足しています"));
  });

  it("separates stores and excludes repeat, cancelled, and special segment records", () => {
    const eligible = [5_000, 5_500, 6_000].flatMap((price, priceIndex) =>
      Array.from({ length: 4 }, (_, index) => sale({
        id: `${price}-${index}`,
        date: `2026-0${priceIndex + 1}-${String(index + 1).padStart(2, "0")}`,
        tech_sales: price,
        coupon_name: "美容液仕上げ",
      })),
    );
    const sales = [
      ...eligible,
      sale({ store_name: "神戸店", tech_sales: 4_000 }),
      sale({ companyId: "company-b", tech_sales: 7_000 }),
      sale({ customer_type: "リピ" }),
      sale({ is_cancelled: true }),
      sale({ segment_tags: ["model_price"] }),
    ];
    const results = assessCouponAnalysisReadiness(sales, "company-a", {
      minimumReservations: 10,
      minimumWeeks: 3,
      minimumPriceVariations: 3,
      minimumWordingSamples: 10,
    });

    const rokko = results.find((result) => result.storeName === "六甲道店");
    assert.equal(rokko?.reservationCount, 12);
    assert.equal(rokko?.canEstimatePrice, true);
    assert.equal(rokko?.canEstimateWording, true);
    assert.equal(results.find((result) => result.storeName === "神戸店")?.reservationCount, 1);
  });

  it("requires an explicit tenant scope", () => {
    assert.throws(
      () => assessCouponAnalysisReadiness([sale()], ""),
      /companyId is required/,
    );
  });
});
