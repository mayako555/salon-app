import assert from "node:assert/strict";
import test from "node:test";
import { resolvePaymentReservationId } from "@/lib/payment-sync";

test("uses the reservation linked directly from the sale", () => {
  assert.equal(resolvePaymentReservationId("sale-reservation", "requested-reservation"), "sale-reservation");
});

test("uses the requested reservation for CSV sales without a reverse link", () => {
  assert.equal(resolvePaymentReservationId(undefined, "csv-reservation"), "csv-reservation");
});

test("does not invent a reservation link", () => {
  assert.equal(resolvePaymentReservationId(undefined, undefined), undefined);
});
