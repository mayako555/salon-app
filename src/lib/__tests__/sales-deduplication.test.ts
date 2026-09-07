import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deduplicateSales,
  reconcileMonthlySales,
  type DeduplicatableSale,
} from "@/lib/sales-deduplication";

function sale(overrides: Partial<DeduplicatableSale> = {}): DeduplicatableSale {
  return {
    id: "sale-1",
    customer_id: "customer-1",
    customer_name: "山田 花子",
    staff_id: "staff-1",
    staff_name: "佐藤",
    date: "2026-08-10",
    time: "10:00",
    store_id: "store-1",
    store_name: "Jasmine Lash 六甲店",
    source: "hotpepper",
    tech_sales: 8_000,
    product_sales: 0,
    nomination_fee: 0,
    discount: 0,
    treatment_minutes: 60,
    created_at: 1,
    ...overrides,
  };
}

describe("deduplicateSales", () => {
  it("prefers a POS checkout over a HotPepper record for the same visit", () => {
    const csv = sale({ id: "csv", source: "hotpepper" });
    const pos = sale({ id: "pos", source: "checkout" });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
    assert.deepEqual(deduplicateSales([pos, csv]), [pos]);
  });

  it("treats csv_estimated as an imported record", () => {
    const csv = sale({ id: "csv", source: "csv_estimated" });
    const manual = sale({ id: "manual", source: "manual" });

    assert.deepEqual(deduplicateSales([csv, manual]), [manual]);
  });

  it("keeps same-name and same-time visits from different stores", () => {
    const rokko = sale({ id: "rokko", store_id: "store-1", store_name: "Jasmine Lash 六甲店" });
    const kobe = sale({ id: "kobe", store_id: "store-2", store_name: "Jasmine Lash 神戸店" });

    assert.equal(deduplicateSales([rokko, kobe]).length, 2);
  });

  it("keeps different customer IDs even when names and times match", () => {
    const first = sale({ id: "first", customer_id: "customer-1" });
    const second = sale({ id: "second", customer_id: "customer-2" });

    assert.equal(deduplicateSales([first, second]).length, 2);
  });

  it("keeps separate visits by the same customer on the same day", () => {
    const morning = sale({ id: "morning", source: "checkout", time: "10:00" });
    const afternoon = sale({ id: "afternoon", source: "checkout", time: "15:00" });

    assert.equal(deduplicateSales([morning, afternoon]).length, 2);
  });

  it("normalizes customer spacing, store aliases and time seconds for legacy imports", () => {
    const csv = sale({
      id: "csv",
      customer_id: undefined,
      customer_name: "山田　花子",
      time: "10:00:00",
      store_id: undefined,
      store_name: "六甲道",
      source: "hotpepper",
    });
    const pos = sale({
      id: "pos",
      customer_id: undefined,
      customer_name: "山田花子",
      store_id: undefined,
      store_name: "Jasmine Lash 六甲店",
      source: "checkout",
    });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("matches a CSV checkout end time to the POS start time plus treatment duration", () => {
    const csv = sale({ id: "csv", source: "hotpepper", time: "11:00", treatment_minutes: undefined });
    const pos = sale({ id: "pos", source: "checkout", time: "10:00", treatment_minutes: 60 });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("matches legacy malformed time values only when their numeric difference equals the duration", () => {
    const csv = sale({ id: "csv", source: "hotpepper", time: "94:95", treatment_minutes: undefined });
    const pos = sale({ id: "pos", source: "checkout", time: "94:35", treatment_minutes: 60 });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("does not merge start/end time candidates when their amounts differ", () => {
    const csv = sale({ id: "csv", source: "hotpepper", time: "11:00", tech_sales: 7_000 });
    const pos = sale({ id: "pos", source: "checkout", time: "10:00", treatment_minutes: 60, tech_sales: 8_000 });

    assert.equal(deduplicateSales([csv, pos]).length, 2);
  });

  it("does not merge start/end time candidates when their staff differ", () => {
    const csv = sale({ id: "csv", source: "hotpepper", time: "11:00", staff_id: "staff-2", staff_name: "鈴木" });
    const pos = sale({ id: "pos", source: "checkout", time: "10:00", treatment_minutes: 60, staff_id: "staff-1" });

    assert.equal(deduplicateSales([csv, pos]).length, 2);
  });

  it("falls back to matching staff names when legacy systems use different staff IDs", () => {
    const csv = sale({ id: "csv", source: "hotpepper", time: "11:00", staff_id: "csv-staff", staff_name: "佐藤" });
    const pos = sale({ id: "pos", source: "checkout", time: "10:00", staff_id: "pos-staff", staff_name: "佐藤" });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("uses a shared reservation ID as the strongest visit identity", () => {
    const csv = sale({ id: "csv", source_reservation_id: "reservation-1", customer_name: "旧姓" });
    const pos = sale({ id: "pos", source: "checkout", source_reservation_id: "reservation-1", customer_name: "新姓" });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("falls back to strict visit matching when duplicate imports created different reservation IDs", () => {
    const csv = sale({
      id: "csv",
      source: "hotpepper",
      source_reservation_id: "csv-reservation",
      time: "11:00",
    });
    const pos = sale({
      id: "pos",
      source: "checkout",
      source_reservation_id: "pos-reservation",
      time: "10:00",
      treatment_minutes: 60,
    });

    assert.deepEqual(deduplicateSales([csv, pos]), [pos]);
  });

  it("keeps records with insufficient identity data instead of risking data loss", () => {
    const first = sale({ id: "first", store_id: undefined, store_name: undefined });
    const second = sale({ id: "second", store_id: undefined, store_name: undefined });

    assert.equal(deduplicateSales([first, second]).length, 2);
  });

  it("keeps the newer record when sources have equal priority", () => {
    const older = sale({ id: "older", source: "checkout", updated_at: 100 });
    const newer = sale({ id: "newer", source: "manual", updated_at: 200 });

    assert.deepEqual(deduplicateSales([older, newer]), [newer]);
  });
});

describe("reconcileMonthlySales", () => {
  it("uses an imported store ledger as authoritative and excludes unmatched POS rows", () => {
    const imported = sale({ id: "csv", source: "hotpepper", time: "11:00" });
    const unmatchedPos = sale({
      id: "unmatched-pos",
      source: "checkout",
      customer_id: "customer-2",
      customer_name: "別のお客様",
      time: "15:00",
    });

    assert.deepEqual(reconcileMonthlySales([imported, unmatchedPos]), [imported]);
  });

  it("retains a matched POS row as the editable primary record", () => {
    const imported = sale({ id: "csv", source: "hotpepper", time: "11:00" });
    const matchedPos = sale({ id: "pos", source: "checkout", time: "10:00", treatment_minutes: 60 });

    assert.deepEqual(reconcileMonthlySales([imported, matchedPos]), [matchedPos]);
  });

  it("retains POS rows for stores without an imported ledger", () => {
    const imported = sale({ id: "csv", source: "hotpepper", store_id: "store-1" });
    const pos = sale({ id: "pos", source: "checkout", store_id: "store-2" });

    assert.deepEqual(reconcileMonthlySales([imported, pos]), [imported, pos]);
  });
});
