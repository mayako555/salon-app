export type CompetitorPriceSource = "manual" | "csv" | "external_api" | "crawler";

export type CompetitorPriceRecord = {
  id: string;
  companyId: string;
  storeName: string;
  menuCategory: string;
  competitorName: string;
  area: string;
  price: number;
  capturedAt: string;
  sourceType: CompetitorPriceSource;
};

export type CompetitorPriceSummary = {
  latestPrices: CompetitorPriceRecord[];
  medianPrice: number | null;
  relativePriceRatio: number | null;
  differencePercent: number | null;
};

const normalize = (value: string): string => value.normalize("NFKC").replace(/\s+/g, " ").trim();

export function filterCompetitorPriceHistory(
  records: readonly CompetitorPriceRecord[],
  companyId: string,
  storeName: string,
  menuCategory: string,
): CompetitorPriceRecord[] {
  if (!companyId.trim()) throw new Error("companyId is required for competitor price analysis");
  return records.filter((record) =>
    record.companyId === companyId &&
    normalize(record.storeName) === normalize(storeName) &&
    normalize(record.menuCategory) === normalize(menuCategory),
  );
}

export function summarizeCompetitorPrices(
  records: readonly CompetitorPriceRecord[],
  area: string,
  ownPrice: number | null,
  asOfDate?: string,
): CompetitorPriceSummary {
  const selectedArea = normalize(area);
  const latestByCompetitor = new Map<string, CompetitorPriceRecord>();

  records
    .filter((record) => normalize(record.area) === selectedArea)
    .filter((record) => !asOfDate || record.capturedAt <= asOfDate)
    .filter((record) => Number.isFinite(record.price) && record.price > 0)
    .forEach((record) => {
      const key = normalize(record.competitorName).toLowerCase();
      const existing = latestByCompetitor.get(key);
      if (!existing || record.capturedAt > existing.capturedAt ||
        (record.capturedAt === existing.capturedAt && record.id > existing.id)) {
        latestByCompetitor.set(key, record);
      }
    });

  const latestPrices = [...latestByCompetitor.values()]
    .sort((a, b) => a.competitorName.localeCompare(b.competitorName, "ja"));
  const prices = latestPrices.map((record) => record.price).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const medianPrice = prices.length === 0
    ? null
    : prices.length % 2 === 1
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2;
  const relativePriceRatio = medianPrice && ownPrice && ownPrice > 0 ? ownPrice / medianPrice : null;

  return {
    latestPrices,
    medianPrice,
    relativePriceRatio,
    differencePercent: relativePriceRatio == null ? null : (relativePriceRatio - 1) * 100,
  };
}
