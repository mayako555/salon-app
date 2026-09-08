import { getNormalizedStoreName } from "./store-utils";

export type DeduplicatableSale = {
  id: string;
  customer_id?: string;
  customer_name?: string;
  staff_id?: string;
  staff_name?: string;
  date?: string;
  time?: string;
  store_id?: string;
  store_name?: string;
  source?: string;
  source_reservation_id?: string;
  tech_sales?: number;
  product_sales?: number;
  nomination_fee?: number;
  discount?: number;
  treatment_minutes?: number;
  payment_method?: string;
  payment_status?: string;
  split_payments?: { method: string; amount: number }[];
  note?: string;
  created_at?: unknown;
  updated_at?: unknown;
};

function normalizeCustomerName(name?: string): string {
  return (name || "").normalize("NFKC").replace(/[\s　]+/g, "").toLowerCase();
}

function normalizeTime(time?: string): string {
  const match = (time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizedStoreName(name?: string): string {
  if (!name) return "";
  return getNormalizedStoreName(name).normalize("NFKC").replace(/[\s　]+/g, "").toLowerCase();
}

function isSameStore(a: DeduplicatableSale, b: DeduplicatableSale): boolean {
  if (a.store_id && b.store_id) return a.store_id === b.store_id;

  const aName = normalizedStoreName(a.store_name);
  const bName = normalizedStoreName(b.store_name);
  return Boolean(aName && bName && aName === bName);
}

function isImported(sale: DeduplicatableSale): boolean {
  return sale.source === "hotpepper" || sale.source === "csv_estimated";
}

function saleAmount(sale: DeduplicatableSale): number {
  return Number(sale.tech_sales || 0) +
    Number(sale.product_sales || 0) +
    Number(sale.nomination_fee || 0) -
    Number(sale.discount || 0);
}

function isSameStaff(a: DeduplicatableSale, b: DeduplicatableSale): boolean {
  if (a.staff_id && b.staff_id && a.staff_id === b.staff_id) return true;
  const aName = normalizeCustomerName(a.staff_name);
  const bName = normalizeCustomerName(b.staff_name);
  return Boolean(aName && bName && aName === bName);
}

function minutesSinceMidnight(time?: string): number | null {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

function matchesCheckoutStartAndImportedEnd(a: DeduplicatableSale, b: DeduplicatableSale): boolean {
  if (isImported(a) === isImported(b)) return false;

  const imported = isImported(a) ? a : b;
  const checkout = isImported(a) ? b : a;
  const checkoutStart = minutesSinceMidnight(checkout.time);
  const importedEnd = minutesSinceMidnight(imported.time);
  const duration = Number(checkout.treatment_minutes || 0);

  if (checkoutStart === null || importedEnd === null || duration <= 0) return false;
  const endMatchesDuration = checkoutStart + duration === importedEnd ||
    (checkoutStart + duration) % (24 * 60) === importedEnd;

  return endMatchesDuration &&
    saleAmount(checkout) === saleAmount(imported) &&
    isSameStaff(checkout, imported);
}

function isSameVisit(a: DeduplicatableSale, b: DeduplicatableSale): boolean {
  if (a.source_reservation_id && b.source_reservation_id) {
    if (a.source_reservation_id === b.source_reservation_id) return true;
  }

  if (!a.date || a.date !== b.date || !isSameStore(a, b)) return false;
  const aName = normalizeCustomerName(a.customer_name);
  const bName = normalizeCustomerName(b.customer_name);
  if (a.customer_id && b.customer_id) {
    if (a.customer_id !== b.customer_id) return false;
  } else if (!aName || aName !== bName) {
    return false;
  }

  const sameRecordedTime = Boolean(normalizeTime(a.time) && normalizeTime(a.time) === normalizeTime(b.time));
  return sameRecordedTime || matchesCheckoutStartAndImportedEnd(a, b);
}

function sourcePriority(source?: string): number {
  return source === "hotpepper" || source === "csv_estimated" ? 0 : 1;
}

function timestampValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function") return Number(toMillis.call(value)) || 0;
  }
  return 0;
}

function preferredSale<T extends DeduplicatableSale>(current: T, candidate: T): T {
  const currentPriority = sourcePriority(current.source);
  const candidatePriority = sourcePriority(candidate.source);
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }

  const currentTimestamp = timestampValue(current.updated_at) || timestampValue(current.created_at);
  const candidateTimestamp = timestampValue(candidate.updated_at) || timestampValue(candidate.created_at);
  return candidateTimestamp > currentTimestamp ? candidate : current;
}

function mergeImportedLedgerWithPayment<T extends DeduplicatableSale>(imported: T, checkout: T): T {
  const merged: T = {
    ...imported,
    payment_method: checkout.payment_method || imported.payment_method,
    payment_status: checkout.payment_status || imported.payment_status,
    source_reservation_id: checkout.source_reservation_id || imported.source_reservation_id,
  };
  if (checkout.split_payments || imported.split_payments) {
    merged.split_payments = checkout.split_payments || imported.split_payments;
  }
  if (checkout.note || imported.note) {
    merged.note = checkout.note || imported.note;
  }
  return merged;
}

export function deduplicateSales<T extends DeduplicatableSale>(sales: readonly T[]): T[] {
  const result: T[] = [];

  for (const sale of sales) {
    const duplicateIndex = result.findIndex((existing) => isSameVisit(existing, sale));
    if (duplicateIndex === -1) {
      result.push(sale);
    } else {
      result[duplicateIndex] = preferredSale(result[duplicateIndex], sale);
    }
  }

  return result;
}

/**
 * Reconciles one month's sales for reporting.
 *
 * A SalonBoard import is the finalized register ledger for its store. Once a
 * store has imported rows, its amounts remain authoritative while payment
 * details from matched POS rows are overlaid onto it. Unmatched POS rows are
 * excluded from that month's report.
 * Stores without imported rows continue to report their POS/manual sales.
 */
export function reconcileMonthlySales<T extends DeduplicatableSale>(sales: readonly T[]): T[] {
  const importedSales = sales.filter(isImported);
  const reconciled = sales.map((sale) => {
    if (!isImported(sale)) return sale;
    const checkout = sales.find((candidate) => !isImported(candidate) && isSameVisit(sale, candidate));
    return checkout ? mergeImportedLedgerWithPayment(sale, checkout) : sale;
  });
  return deduplicateSales(reconciled.filter((sale) =>
    isImported(sale) || !importedSales.some((importedSale) => isSameStore(importedSale, sale))
  ));
}
