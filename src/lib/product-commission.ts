export function calculateTaxExclusiveProductCommission(
  taxInclusiveSales: number,
  ratePercent = 10
) {
  const safeSales = Number.isFinite(taxInclusiveSales) ? Math.max(0, taxInclusiveSales) : 0;
  const safeRate = Number.isFinite(ratePercent) ? Math.max(0, ratePercent) : 0;
  // 1.1 division can become 1799.999... in binary floating point.
  const taxExclusiveSales = Math.floor((safeSales * 10) / 11);

  return {
    taxExclusiveSales,
    commission: Math.floor(taxExclusiveSales * (safeRate / 100)),
  };
}

export function normalizeProductStoreLabel(storeName: string) {
  const compact = (storeName || "不明").replace(/[\s　]/g, "");
  if (compact.includes("六甲")) return "六甲";
  if (compact.includes("元町") || compact.toUpperCase().includes("BROWGYM")) return "元町";
  if (compact.includes("神戸")) return "神戸";
  return storeName || "不明";
}
