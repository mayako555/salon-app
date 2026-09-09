import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSalesDateTime,
  isDuplicateImportedReservation,
  isDuplicateImportedSale,
  normalizeSalesDate,
  normalizeSalesTime,
  parseSalesAmount,
  parseTreatmentDuration,
} from "../sales-import-normalization";

describe("sales import normalization", () => {
  it("extracts the explicit accounting date and time before fallback columns", () => {
    assert.deepEqual(extractSalesDateTime({
      "会計日": "2026/09/09",
      "来店日": "2026/09/08",
      "会計時間": 930,
      "来店時間": 1000,
    }), { rawDate: "2026/09/09", rawTime: "930" });
  });

  it("falls back to visit columns and combined date-time columns", () => {
    assert.deepEqual(extractSalesDateTime({
      "来店日": "2026/09/08",
      "来店時間": "10:00",
    }), { rawDate: "2026/09/08", rawTime: "10:00" });

    assert.deepEqual(extractSalesDateTime({
      "来店日時": "2026/09/07 11:30",
    }), { rawDate: "2026/09/07", rawTime: "11:30" });

    assert.deepEqual(extractSalesDateTime({
      "予約日時": "2026/09/06",
    }), { rawDate: "2026/09/06", rawTime: "" });
  });

  it("returns empty values when no supported date or time columns exist", () => {
    assert.deepEqual(extractSalesDateTime({}), { rawDate: "", rawTime: "" });
  });

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

  it("normalizes compact sales times and preserves colon-separated values", () => {
    assert.equal(normalizeSalesTime("930"), "09:30");
    assert.equal(normalizeSalesTime("0930"), "09:30");
    assert.equal(normalizeSalesTime("09:30"), "09:30");
    assert.equal(normalizeSalesTime("09:30:00"), "09:30:00");
    assert.equal(normalizeSalesTime(""), "00:00");
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

  const existingReservation = {
    source_sales_id: "sale-1",
    companyId: "company-1",
    store_name: "Jasmine Lash 六甲道店",
    staff_name: "佐藤",
    customer_name: "山田 花子",
    date: "2026-08-10",
    end_time: "11:00",
    expected_price: 9_000,
  };

  const reservationCandidate = {
    sourceSalesId: "sale-2",
    companyId: "company-1",
    storeName: "Jasmine Lash 六甲道店",
    staffName: "佐藤",
    customerName: "山田 花子",
    date: "2026-08-10",
    endTime: "11:00",
    expectedPrice: 9_000,
  };

  it("detects an imported reservation by source sale ID or the existing exact fields", () => {
    assert.equal(isDuplicateImportedReservation([existingReservation], {
      ...reservationCandidate,
      sourceSalesId: "sale-1",
      customerName: "別のお客様",
    }), true);
    assert.equal(isDuplicateImportedReservation([existingReservation], reservationCandidate), true);
  });

  it("requires every existing reservation field when source sale IDs differ", () => {
    const differences = [
      { companyId: "company-2" },
      { storeName: "Jasmine Lash 神戸店" },
      { staffName: "別担当" },
      { customerName: "別のお客様" },
      { date: "2026-08-11" },
      { endTime: "12:00" },
      { expectedPrice: 8_999 },
    ];

    for (const difference of differences) {
      assert.equal(isDuplicateImportedReservation(
        [existingReservation],
        { ...reservationCandidate, ...difference }
      ), false);
    }
  });
});
