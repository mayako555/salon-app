export function resolvePaymentReservationId(
  saleReservationId?: string,
  requestedReservationId?: string
): string | undefined {
  return saleReservationId || requestedReservationId;
}
