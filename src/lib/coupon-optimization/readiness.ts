import type { SalesRecord } from "@/types/sales";
import {
  DEFAULT_COUPON_ANALYSIS_CONFIG,
  type CouponAnalysisConfig,
} from "./config";

export type AnalysisConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export type CouponAnalysisReadiness = {
  key: string;
  storeName: string;
  menuCategory: string;
  reservationCount: number;
  observedWeeks: number;
  priceVariationCount: number;
  couponTextCount: number;
  couponTextCoverage: number;
  confidence: AnalysisConfidence;
  canEstimatePrice: boolean;
  canEstimateWording: boolean;
  warnings: string[];
};

type Candidate = {
  storeName: string;
  menuCategory: string;
  date: string;
  price: number;
  hasCouponText: boolean;
};

function isoWeekKey(dateText: string): string | null {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeLabel(value: string | undefined): string {
  return (value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function toCandidate(
  sale: SalesRecord,
  config: CouponAnalysisConfig,
): Candidate | null {
  if (sale.source !== "hotpepper" || sale.status !== "closed") return null;
  if (sale.customer_type !== "新規" || sale.is_cancelled) return null;
  if (sale.merge_status === "DELETED" || sale.treatment_excluded) return null;
  if ((sale.segment_tags || []).some((tag) => config.excludedSegmentTags.includes(tag))) return null;

  const storeName = normalizeLabel(sale.store_name);
  const menuCategory = normalizeLabel(sale.menu_category) || normalizeLabel(sale.menu_course);
  const price = Math.max(0, Number(sale.tech_sales || 0) - Number(sale.discount || 0));
  if (!storeName || !menuCategory || !sale.date || price <= 0) return null;

  return {
    storeName,
    menuCategory,
    date: sale.date,
    price,
    hasCouponText: Boolean(normalizeLabel(sale.coupon_name) || normalizeLabel(sale.coupon_description)),
  };
}

export function assessCouponAnalysisReadiness(
  sales: readonly SalesRecord[],
  companyId: string,
  overrides: Partial<CouponAnalysisConfig> = {},
): CouponAnalysisReadiness[] {
  if (!companyId.trim()) {
    throw new Error("companyId is required for coupon analysis");
  }
  const config: CouponAnalysisConfig = {
    ...DEFAULT_COUPON_ANALYSIS_CONFIG,
    ...overrides,
    excludedSegmentTags: overrides.excludedSegmentTags || DEFAULT_COUPON_ANALYSIS_CONFIG.excludedSegmentTags,
  };
  const groups = new Map<string, Candidate[]>();

  for (const sale of sales) {
    // Keep this guard even when the caller already queried by companyId.
    // Analysis results must never aggregate records from another tenant.
    if (sale.companyId !== companyId) continue;
    const candidate = toCandidate(sale, config);
    if (!candidate) continue;
    const key = `${candidate.storeName}::${candidate.menuCategory}`;
    groups.set(key, [...(groups.get(key) || []), candidate]);
  }

  return [...groups.entries()].map(([key, candidates]) => {
    const weeks = new Set(candidates.map((item) => isoWeekKey(item.date)).filter(Boolean));
    const prices = new Set(candidates.map((item) => item.price));
    const couponTextCount = candidates.filter((item) => item.hasCouponText).length;
    const warnings: string[] = [];

    if (candidates.length < config.minimumReservations) warnings.push("予約件数が不足しています");
    if (weeks.size < config.minimumWeeks) warnings.push("観測週数が不足しています");
    if (prices.size < config.minimumPriceVariations) warnings.push("価格の種類が不足しています");
    if (couponTextCount < config.minimumWordingSamples) warnings.push("クーポン文言の観測数が不足しています");
    warnings.push("予約ゼロの掲載週をCSVだけでは確認できないため、結果は過去実績上の関連性です");

    const canEstimatePrice = candidates.length >= config.minimumReservations &&
      weeks.size >= config.minimumWeeks &&
      prices.size >= config.minimumPriceVariations;
    const canEstimateWording = canEstimatePrice && couponTextCount >= config.minimumWordingSamples;

    let confidence: AnalysisConfidence = "INSUFFICIENT";
    if (canEstimatePrice && canEstimateWording) {
      confidence = candidates.length >= config.minimumReservations * 3 && weeks.size >= config.minimumWeeks * 2
        ? "HIGH"
        : "MEDIUM";
    } else if (candidates.length >= Math.ceil(config.minimumReservations / 2) && prices.size >= 2) {
      confidence = "LOW";
    }

    return {
      key,
      storeName: candidates[0].storeName,
      menuCategory: candidates[0].menuCategory,
      reservationCount: candidates.length,
      observedWeeks: weeks.size,
      priceVariationCount: prices.size,
      couponTextCount,
      couponTextCoverage: candidates.length === 0 ? 0 : couponTextCount / candidates.length,
      confidence,
      canEstimatePrice,
      canEstimateWording,
      warnings,
    };
  }).sort((a, b) => a.storeName.localeCompare(b.storeName, "ja") || a.menuCategory.localeCompare(b.menuCategory, "ja"));
}
