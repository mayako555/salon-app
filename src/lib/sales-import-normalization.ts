import { getNormalizedStoreName } from "@/lib/store-utils";

const DEFAULT_TREATMENT_MINUTES = 60;

export type ExistingImportedSale = {
  store_name?: string;
  date?: string;
  time?: string;
  customer_name?: string;
  staff_name?: string;
  tech_sales?: number;
  product_sales?: number;
  nomination_fee?: number;
  discount?: number;
};

export type ImportedSaleIdentity = {
  storeName: string;
  date: string;
  time: string;
  customerName: string;
  staffName: string;
  total: number;
};

export function isDuplicateImportedSale(
  existingSales: readonly ExistingImportedSale[],
  candidate: ImportedSaleIdentity
): boolean {
  return existingSales.some((sale) => {
    const existingTotal = Number(sale.tech_sales || 0) +
      Number(sale.product_sales || 0) +
      Number(sale.nomination_fee || 0) -
      Number(sale.discount || 0);

    return getNormalizedStoreName(sale.store_name || "") === getNormalizedStoreName(candidate.storeName) &&
      sale.date === candidate.date &&
      sale.time === candidate.time &&
      existingTotal === candidate.total &&
      (sale.customer_name === candidate.customerName || sale.staff_name === candidate.staffName);
  });
}

export function parseTreatmentDuration(duration: string | undefined): number {
  if (!duration) return DEFAULT_TREATMENT_MINUTES;

  let totalMinutes = 0;
  const hoursMatch = duration.match(/(\d+(?:\.\d+)?)\s*(?:時間|h)/i);
  const minutesMatch = duration.match(/(\d+)\s*分/);

  if (hoursMatch) totalMinutes += Number.parseFloat(hoursMatch[1]) * 60;
  if (minutesMatch) totalMinutes += Number.parseInt(minutesMatch[1], 10);

  if (totalMinutes > 0) return totalMinutes;

  const minutes = Number.parseInt(duration, 10);
  return Number.isNaN(minutes) ? DEFAULT_TREATMENT_MINUTES : minutes;
}

export function normalizeSalesDate(rawDate: string): string {
  if (rawDate.includes("/")) {
    const parts = rawDate.split("/");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  if (rawDate.includes("-")) {
    const parts = rawDate.split("-");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  if (rawDate.length === 8) {
    return `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
  }

  return rawDate;
}

export function parseSalesAmount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  return Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10) || 0;
}
