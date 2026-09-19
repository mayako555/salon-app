export const COUPON_ANALYSIS_DEFAULTS = {
  minimumWeeks: 12,
  minimumReservations: 30,
  minimumPriceVariations: 3,
  minimumWordingSamples: 10,
  priceStep: 100,
  maximumDiscountRate: 0.7,
  minimumCompetitorCoveredWeeks: 8,
  minimumCompetitorMedianVariations: 3,
  maximumPredictorCorrelation: 0.98,
} as const;

export type CouponAnalysisConfig = {
  minimumWeeks: number;
  minimumReservations: number;
  minimumPriceVariations: number;
  minimumWordingSamples: number;
  priceStep: number;
  maximumDiscountRate: number;
  minimumCompetitorCoveredWeeks: number;
  minimumCompetitorMedianVariations: number;
  maximumPredictorCorrelation: number;
  excludedSegmentTags: string[];
};

export const DEFAULT_COUPON_ANALYSIS_CONFIG: CouponAnalysisConfig = {
  ...COUPON_ANALYSIS_DEFAULTS,
  excludedSegmentTags: ["student_discount", "model_price", "employee_treatment"],
};
