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
