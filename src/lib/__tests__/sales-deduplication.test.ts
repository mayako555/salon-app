import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deduplicateSales, type DeduplicatableSale } from "@/lib/sales-deduplication";

function sale(overrides: Partial<DeduplicatableSale> = {}): DeduplicatableSale {
  return {
    id: "sale-1",
    customer_id: "customer-1",
    customer_name: "山田 花子",
    date: "2026-08-10",
    time: "10:00",
    store_id: "store-1",
    store_name: "Jasmine Lash 六甲店",
    source: "hotpepper",
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

  it("uses a shared reservation ID as the strongest visit identity", () => {
    const csv = sale({ id: "csv", source_reservation_id: "reservation-1", customer_name: "旧姓" });
    const pos = sale({ id: "pos", source: "checkout", source_reservation_id: "reservation-1", customer_name: "新姓" });

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
