"use server";

import { getCurrentUserContext } from "@/lib/auth-server";
import { requireCompanyId } from "@/lib/authorization";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildCouponOptimizationModel,
  type CouponOptimizationModel,
} from "@/lib/coupon-optimization/model";
import {
  assessCouponAnalysisReadiness,
  type CouponAnalysisReadiness,
} from "@/lib/coupon-optimization/readiness";
import type { SalesRecord } from "@/types/sales";

const ALLOWED_ROLES = new Set(["systemOwner", "companyOwner", "admin", "manager", "storeManager"]);

export type CouponOptimizationResponse = {
  success: boolean;
  error?: string;
  scopes?: CouponAnalysisReadiness[];
  model?: CouponOptimizationModel;
  currentObservedPrice?: number | null;
};

export async function getCouponOptimizationAnalysis(input?: {
  storeName?: string;
  menuCategory?: string;
  months?: 12 | 24 | 36;
}): Promise<CouponOptimizationResponse> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ALLOWED_ROLES.has(ctx.role)) return { success: false, error: "権限がありません" };

    // Operational analytics always needs an explicitly selected tenant.
    // An unscoped system owner must impersonate a company first.
    const companyId = requireCompanyId(ctx);
    const months = input?.months || 36;
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    const startDate = start.toISOString().slice(0, 10);

    const snapshot = await adminDb.collection("sales")
      .where("companyId", "==", companyId)
      .get();
    const sales: SalesRecord[] = snapshot.docs
      .map((doc: { id: string; data: () => Record<string, unknown> }) => ({ id: doc.id, ...doc.data() }) as SalesRecord)
      .filter((sale: SalesRecord) => typeof sale.date === "string" && sale.date >= startDate);

    const scopes = assessCouponAnalysisReadiness(sales, companyId);
    if (!input?.storeName || !input?.menuCategory) return { success: true, scopes };

    const selectedScope = scopes.find((scope) =>
      scope.storeName === input.storeName && scope.menuCategory === input.menuCategory,
    );
    if (!selectedScope) return { success: false, error: "選択した分析対象のデータがありません", scopes };

    const model = buildCouponOptimizationModel(sales, companyId, input.storeName, input.menuCategory);
    const recentPrices = sales
      .filter((sale: SalesRecord) => sale.store_name === input.storeName &&
        (sale.menu_category || sale.menu_course) === input.menuCategory &&
        sale.source === "hotpepper" && sale.status === "closed" && sale.customer_type === "新規")
      .sort((a: SalesRecord, b: SalesRecord) => b.date.localeCompare(a.date))
      .map((sale: SalesRecord) => Math.max(0, Number(sale.tech_sales || 0) - Number(sale.discount || 0)))
      .filter((price: number) => price > 0);

    return {
      success: true,
      scopes,
      model,
      currentObservedPrice: recentPrices[0] ?? null,
    };
  } catch (error) {
    console.error("Coupon optimization analysis failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "分析データの取得に失敗しました" };
  }
}
