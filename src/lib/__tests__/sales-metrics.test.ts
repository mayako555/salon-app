import assert from "node:assert/strict";
import test from "node:test";
import { getSaleGrossAmount } from "../sales-metrics";

test("売上管理画面と同じ項目で総売上を計算する", () => {
  assert.equal(
    getSaleGrossAmount({
      tech_sales: 10_000,
      product_sales: 2_000,
      nomination_fee: 500,
      cancel_fee: 1_000,
      discount: 800,
    }),
    12_700,
  );
});

test("任意項目が未設定でも0として扱う", () => {
  assert.equal(
    getSaleGrossAmount({
      tech_sales: 8_000,
      product_sales: 0,
      nomination_fee: undefined as unknown as number,
      cancel_fee: undefined as unknown as number,
      discount: 0,
    }),
    8_000,
  );
});
