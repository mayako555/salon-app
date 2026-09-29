import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { serializeFirestoreRecord } from "@/lib/firestore-serialization";

describe("serializeFirestoreRecord", () => {
  it("converts Firestore-like timestamps and Date values to milliseconds", () => {
    const result = serializeFirestoreRecord({
      created_at: { toMillis: () => 1_725_000_000_000 },
      updated_at: new Date("2026-09-08T00:00:00.000Z"),
    });

    assert.deepEqual(result, {
      created_at: 1_725_000_000_000,
      updated_at: Date.parse("2026-09-08T00:00:00.000Z"),
    });
  });

  it("preserves ordinary sales fields without changing their values", () => {
    const splitPayments = [{ method: "現金", amount: 5_000 }];
    const result = serializeFirestoreRecord({
      payment_method: "現金",
      tech_sales: 5_000,
      split_payments: splitPayments,
      note: null,
    });

    assert.deepEqual(result, {
      payment_method: "現金",
      tech_sales: 5_000,
      split_payments: splitPayments,
      note: null,
    });
    assert.equal(result.split_payments, splitPayments);
  });
});

// Lefite's store was created with createdAt rather than created_at. Returning
// this Admin SDK class unchanged makes the entire karte form action reject.
it("serializes legacy master createdAt without changing stored data", () => {
  const createdAt = Timestamp.fromMillis(1_790_600_000_981);
  const record = { companyId: "leﬁte-test", itemType: "store", name: "Test store", createdAt, updated_at: createdAt };
  const result = serializeFirestoreRecord(record);
  assert.equal(result.createdAt, createdAt.toMillis());
  assert.equal(result.updated_at, createdAt.toMillis());
  assert.equal(result.companyId, record.companyId);
  assert.equal(record.createdAt, createdAt);
  assert.equal(typeof result.createdAt, "number");
});
