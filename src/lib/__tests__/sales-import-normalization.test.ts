import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDuplicateImportedSale,
  normalizeSalesDate,
  parseSalesAmount,
  parseTreatmentDuration,
} from "../sales-import-normalization";

describe("sales import normalization", () => {
  it("parses supported treatment duration formats", () => {
    assert.equal(parseTreatmentDuration("90分"), 90);
    assert.equal(parseTreatmentDuration("1.5h"), 90);
    assert.equal(parseTreatmentDuration("1時間30分"), 90);
    assert.equal(parseTreatmentDuration("120"), 120);
  });

  it("uses 60 minutes when treatment duration is missing or invalid", () => {
    assert.equal(parseTreatmentDuration(undefined), 60);
    assert.equal(parseTreatmentDuration("不明"), 60);
  });

  it("normalizes supported sales date formats", () => {
    assert.equal(normalizeSalesDate("2026/9/7"), "2026-09-07");
    assert.equal(normalizeSalesDate("2026-9-7"), "2026-09-07");
    assert.equal(normalizeSalesDate("20260907"), "2026-09-07");
  });

  it("preserves unknown date formats", () => {
    assert.equal(normalizeSalesDate("9月7日"), "9月7日");
  });

  it("parses formatted, negative and empty sales amounts", () => {
    assert.equal(parseSalesAmount("¥12,340"), 12_340);
    assert.equal(parseSalesAmount("-3,000円"), -3_000);
    assert.equal(parseSalesAmount(undefined), 0);
    assert.equal(parseSalesAmount(""), 0);
  });

  const existingSale = {
    store_name: "Jasmine Lash 六甲道店",
    date: "2026-08-10",
    time: "11:00",
    customer_name: "山田 花子",
    staff_name: "佐藤",
    tech_sales: 8_000,
    product_sales: 1_000,
    nomination_fee: 500,
    discount: 500,
  };

  it("detects an already imported sale using the existing identity rules", () => {
    assert.equal(isDuplicateImportedSale([existingSale], {
      storeName: "六甲道",
      date: "2026-08-10",
      time: "11:00",
      customerName: "山田 花子",
      staffName: "別担当",
      total: 9_000,
    }), true);

    assert.equal(isDuplicateImportedSale([existingSale], {
      storeName: "六甲道",
      date: "2026-08-10",
      time: "11:00",
      customerName: "別のお客様",
      staffName: "佐藤",
      total: 9_000,
    }), true);
  });

  it("does not merge records when store, date, time, amount, and identity do not match", () => {
    const baseCandidate = {
      storeName: "六甲道",
      date: "2026-08-10",
      time: "11:00",
      customerName: "山田 花子",
      staffName: "佐藤",
      total: 9_000,
    };

    assert.equal(isDuplicateImportedSale([existingSale], { ...baseCandidate, storeName: "神戸店" }), false);
    assert.equal(isDuplicateImportedSale([existingSale], { ...baseCandidate, date: "2026-08-11" }), false);
    assert.equal(isDuplicateImportedSale([existingSale], { ...baseCandidate, time: "12:00" }), false);
    assert.equal(isDuplicateImportedSale([existingSale], { ...baseCandidate, total: 8_999 }), false);
    assert.equal(isDuplicateImportedSale([existingSale], {
      ...baseCandidate,
      customerName: "別のお客様",
      staffName: "別担当",
    }), false);
  });
});
