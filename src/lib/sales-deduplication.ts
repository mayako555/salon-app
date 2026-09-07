import { getNormalizedStoreName } from "./store-utils";

export type DeduplicatableSale = {
  id: string;
  customer_id?: string;
  customer_name?: string;
  date?: string;
  time?: string;
  store_id?: string;
  store_name?: string;
  source?: string;
  source_reservation_id?: string;
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

function isSameVisit(a: DeduplicatableSale, b: DeduplicatableSale): boolean {
  if (a.source_reservation_id && b.source_reservation_id) {
    return a.source_reservation_id === b.source_reservation_id;
  }

  if (!a.date || a.date !== b.date || !isSameStore(a, b)) return false;
  if (!normalizeTime(a.time) || normalizeTime(a.time) !== normalizeTime(b.time)) return false;

  if (a.customer_id && b.customer_id) return a.customer_id === b.customer_id;

  const aName = normalizeCustomerName(a.customer_name);
  const bName = normalizeCustomerName(b.customer_name);
  return Boolean(aName && bName && aName === bName);
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
