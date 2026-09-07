const DEFAULT_TREATMENT_MINUTES = 60;

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
