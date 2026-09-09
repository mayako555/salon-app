import { getNormalizedStoreName } from "@/lib/store-utils";

const DEFAULT_TREATMENT_MINUTES = 60;

export type CsvSalesRow = Record<string, unknown>;

export function extractSalesDateTime(row: CsvSalesRow): { rawDate: string; rawTime: string } {
  let rawDate = String(row["会計日"] || row["来店日"] || "");
  let rawTime = String(row["会計時間"] || row["来店時間"] || "");

  if (!rawDate) {
    const dateTime = String(row["来店日時"] || row["予約日時"] || row["日時"] || "");
    if (dateTime.includes(" ")) {
      const parts = dateTime.split(" ");
      rawDate = parts[0];
      rawTime = parts[1];
    } else if (dateTime) {
      rawDate = dateTime;
    }
  }

  return { rawDate, rawTime };
}

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

export type ExistingImportedReservation = {
  source_sales_id?: string;
  companyId?: string;
  store_name?: string;
  staff_name?: string;
  customer_name?: string;
  date?: string;
  end_time?: string;
  expected_price?: number;
};

export type ImportedReservationIdentity = {
  sourceSalesId: string;
  companyId: string;
  storeName: string;
  staffName: string;
  customerName: string;
  date: string;
  endTime: string;
  expectedPrice: number;
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

export function isDuplicateImportedReservation(
  existingReservations: readonly ExistingImportedReservation[],
  candidate: ImportedReservationIdentity
): boolean {
  return existingReservations.some((reservation) => {
    if (reservation.source_sales_id && reservation.source_sales_id === candidate.sourceSalesId) {
      return true;
    }

    return reservation.companyId === candidate.companyId &&
      reservation.store_name === candidate.storeName &&
      reservation.staff_name === candidate.staffName &&
      reservation.customer_name === candidate.customerName &&
      reservation.date === candidate.date &&
      reservation.end_time === candidate.endTime &&
      Number(reservation.expected_price || 0) === candidate.expectedPrice;
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

export function normalizeSalesTime(rawTime: string): string {
  if (rawTime.includes(":")) return rawTime;

  const paddedTime = rawTime.padStart(4, "0");
  return `${paddedTime.substring(0, 2)}:${paddedTime.substring(2, 4)}`;
}

export function parseSalesAmount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  return Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10) || 0;
}
