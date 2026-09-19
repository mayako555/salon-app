import type { SalesRecord } from "@/types/sales";
import { DEFAULT_COUPON_ANALYSIS_CONFIG, type CouponAnalysisConfig } from "./config";
import { assessCouponAnalysisReadiness, type AnalysisConfidence } from "./readiness";
import { extractWordingCategories } from "./wording";

export type WeeklyCouponObservation = {
  week: string;
  storeName: string;
  menuCategory: string;
  couponSignature: string;
  averagePrice: number;
  reservations: number;
  wordingCategories: string[];
};

export type ModelCoefficient = {
  name: string;
  coefficient: number;
  standardError: number | null;
  pValue: number | null;
  confidenceInterval95: [number, number] | null;
};

export type CouponPricePoint = {
  price: number;
  predictedReservations: number;
  predictedRevenue: number;
  predictedGrossProfit: number | null;
};

export type CouponOptimizationModel = {
  companyId: string;
  storeName: string;
  menuCategory: string;
  confidence: AnalysisConfidence;
  sampleCount: number;
  observedWeeks: number;
  coefficients: ModelCoefficient[];
  rSquared: number | null;
  adjustedRSquared: number | null;
  revenueOptimalPrice: number | null;
  variableCost: number | null;
  grossProfitOptimalPrice: number | null;
  simulation: CouponPricePoint[];
  warnings: string[];
};

type Matrix = number[][];

const normalize = (value: string | undefined): string =>
  (value || "").normalize("NFKC").replace(/\s+/g, " ").trim();

function weekKey(dateText: string): string | null {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function eligibleSale(sale: SalesRecord, companyId: string, config: CouponAnalysisConfig): boolean {
  return sale.companyId === companyId &&
    sale.source === "hotpepper" && sale.status === "closed" &&
    sale.customer_type === "新規" && !sale.is_cancelled &&
    sale.merge_status !== "DELETED" && !sale.treatment_excluded &&
    !(sale.segment_tags || []).some((tag) => config.excludedSegmentTags.includes(tag));
}

export function aggregateWeeklyCouponObservations(
  sales: readonly SalesRecord[],
  companyId: string,
  storeName: string,
  menuCategory: string,
  overrides: Partial<CouponAnalysisConfig> = {},
): WeeklyCouponObservation[] {
  if (!companyId.trim()) throw new Error("companyId is required for coupon analysis");
  const config = { ...DEFAULT_COUPON_ANALYSIS_CONFIG, ...overrides };
  const groups = new Map<string, { prices: number[]; wording: Set<string> }>();

  for (const sale of sales) {
    if (!eligibleSale(sale, companyId, config)) continue;
    const saleStore = normalize(sale.store_name);
    const saleMenu = normalize(sale.menu_category) || normalize(sale.menu_course);
    if (saleStore !== normalize(storeName) || saleMenu !== normalize(menuCategory)) continue;
    const week = weekKey(sale.date);
    const price = Math.max(0, Number(sale.tech_sales || 0) - Number(sale.discount || 0));
    if (!week || price <= 0) continue;
    const couponText = `${sale.coupon_name || ""} ${sale.coupon_description || ""}`.trim();
    const signature = normalize(couponText) || "(文言なし)";
    const key = `${week}::${signature}::${price}`;
    const group = groups.get(key) || { prices: [], wording: new Set<string>() };
    group.prices.push(price);
    extractWordingCategories(couponText).forEach((category) => group.wording.add(category));
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => {
    const [week, couponSignature] = key.split("::");
    return {
      week,
      storeName: normalize(storeName),
      menuCategory: normalize(menuCategory),
      couponSignature,
      averagePrice: group.prices.reduce((sum, price) => sum + price, 0) / group.prices.length,
      reservations: group.prices.length,
      wordingCategories: [...group.wording].sort(),
    };
  }).sort((a, b) => a.week.localeCompare(b.week) || a.averagePrice - b.averagePrice);
}

function transpose(matrix: Matrix): Matrix {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return a.map((row) => b[0].map((_, column) =>
    row.reduce((sum, value, index) => sum + value * b[index][column], 0),
  ));
}

function invert(matrix: Matrix): Matrix | null {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [
    ...row,
    ...Array.from({ length: size }, (_, column) => Number(index === column)),
  ]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(size));
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function fitOls(x: Matrix, y: number[], names: string[]): {
  coefficients: ModelCoefficient[];
  rSquared: number;
  adjustedRSquared: number;
} | null {
  const xt = transpose(x);
  const inverse = invert(multiply(xt, x));
  if (!inverse) return null;
  const beta = multiply(multiply(inverse, xt), y.map((value) => [value])).map(([value]) => value);
  const predicted = x.map((row) => row.reduce((sum, value, index) => sum + value * beta[index], 0));
  const mean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const residualSum = y.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const totalSum = y.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const rSquared = totalSum === 0 ? 0 : 1 - residualSum / totalSum;
  const degrees = y.length - names.length;
  const variance = degrees > 0 ? residualSum / degrees : Number.NaN;
  const standardErrors = inverse.map((row, index) => Math.sqrt(Math.max(0, row[index] * variance)));
  const adjustedRSquared = degrees > 0
    ? 1 - (1 - rSquared) * ((y.length - 1) / degrees)
    : rSquared;
  return {
    coefficients: names.map((name, index) => {
      const standardError = Number.isFinite(standardErrors[index]) ? standardErrors[index] : null;
      const z = standardError && standardError > 0 ? beta[index] / standardError : null;
      return {
        name,
        coefficient: beta[index],
        standardError,
        pValue: z === null ? null : Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z))))),
        confidenceInterval95: standardError === null
          ? null
          : [beta[index] - 1.96 * standardError, beta[index] + 1.96 * standardError],
      };
    }),
    rSquared,
    adjustedRSquared,
  };
}

export function buildCouponOptimizationModel(
  sales: readonly SalesRecord[],
  companyId: string,
  storeName: string,
  menuCategory: string,
  overrides: Partial<CouponAnalysisConfig> = {},
  variableCost: number | null = null,
): CouponOptimizationModel {
  const config = { ...DEFAULT_COUPON_ANALYSIS_CONFIG, ...overrides };
  const readiness = assessCouponAnalysisReadiness(sales, companyId, config)
    .find((item) => item.storeName === normalize(storeName) && item.menuCategory === normalize(menuCategory));
  const observations = aggregateWeeklyCouponObservations(sales, companyId, storeName, menuCategory, config);
  const base = {
    companyId,
    storeName: normalize(storeName),
    menuCategory: normalize(menuCategory),
    confidence: readiness?.confidence || "INSUFFICIENT" as AnalysisConfidence,
    sampleCount: observations.length,
    observedWeeks: new Set(observations.map((item) => item.week)).size,
    warnings: [...(readiness?.warnings || ["分析対象データがありません"]), "CSVでは予約ゼロの掲載週を識別できないため因果効果ではありません"],
  };
  if (!readiness?.canEstimatePrice || observations.length < 4) {
    return { ...base, coefficients: [], rSquared: null, adjustedRSquared: null, revenueOptimalPrice: null, variableCost, grossProfitOptimalPrice: null, simulation: [] };
  }

  const wordingCounts = new Map<string, number>();
  observations.forEach((item) => item.wordingCategories.forEach((category) =>
    wordingCounts.set(category, (wordingCounts.get(category) || 0) + item.reservations),
  ));
  const wording = [...wordingCounts.entries()]
    .filter(([, count]) => count >= config.minimumWordingSamples && count < readiness.reservationCount)
    .map(([category]) => category)
    .sort();
  const names = ["intercept", "price_per_1000", ...wording];
  if (observations.length <= names.length + 1) {
    return { ...base, coefficients: [], rSquared: null, adjustedRSquared: null, revenueOptimalPrice: null, variableCost, grossProfitOptimalPrice: null, simulation: [] };
  }
  const x = observations.map((item) => [
    1,
    item.averagePrice / 1_000,
    ...wording.map((category) => Number(item.wordingCategories.includes(category))),
  ]);
  const fitted = fitOls(x, observations.map((item) => item.reservations), names);
  if (!fitted) {
    return { ...base, coefficients: [], rSquared: null, adjustedRSquared: null, revenueOptimalPrice: null, variableCost, grossProfitOptimalPrice: null, simulation: [], warnings: [...base.warnings, "説明変数が重複しているためモデルを推定できません"] };
  }

  const prices = observations.map((item) => item.averagePrice);
  const minimum = Math.floor(Math.min(...prices) / config.priceStep) * config.priceStep;
  const maximum = Math.ceil(Math.max(...prices) / config.priceStep) * config.priceStep;
  const intercept = fitted.coefficients.find((item) => item.name === "intercept")?.coefficient || 0;
  const priceCoefficient = fitted.coefficients.find((item) => item.name === "price_per_1000")?.coefficient || 0;
  const wordingMeans = wording.map((category) =>
    observations.filter((item) => item.wordingCategories.includes(category)).length / observations.length,
  );
  const simulation: CouponPricePoint[] = [];
  for (let price = minimum; price <= maximum; price += config.priceStep) {
    const wordingEffect = wording.reduce((sum, category, index) => {
      const coefficient = fitted.coefficients.find((item) => item.name === category)?.coefficient || 0;
      return sum + coefficient * wordingMeans[index];
    }, 0);
    const predictedReservations = Math.max(0, intercept + priceCoefficient * (price / 1_000) + wordingEffect);
    simulation.push({
      price,
      predictedReservations,
      predictedRevenue: price * predictedReservations,
      predictedGrossProfit: variableCost == null ? null : (price - variableCost) * predictedReservations,
    });
  }
  const best = simulation.reduce((current, item) => item.predictedRevenue > current.predictedRevenue ? item : current);
  const grossProfitBest = variableCost == null
    ? null
    : simulation.reduce((current, item) =>
      (item.predictedGrossProfit ?? Number.NEGATIVE_INFINITY) > (current.predictedGrossProfit ?? Number.NEGATIVE_INFINITY)
        ? item
        : current,
    );
  return {
    ...base,
    coefficients: fitted.coefficients,
    rSquared: fitted.rSquared,
    adjustedRSquared: fitted.adjustedRSquared,
    revenueOptimalPrice: best.price,
    variableCost,
    grossProfitOptimalPrice: grossProfitBest?.price ?? null,
    simulation,
  };
}
