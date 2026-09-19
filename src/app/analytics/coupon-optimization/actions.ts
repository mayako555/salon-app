"use server";

import { getCurrentUserContext } from "@/lib/auth-server";
import { requireCompanyId } from "@/lib/authorization";
import { adminDb } from "@/lib/firebase-admin";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
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
  variableCost?: number | null;
};

const COST_COLLECTION = "coupon_optimization_costs";

function costSettingId(companyId: string, storeName: string, menuCategory: string): string {
  return createHash("sha256")
    .update(`${companyId}\u0000${storeName.normalize("NFKC").trim()}\u0000${menuCategory.normalize("NFKC").trim()}`)
    .digest("hex");
}

async function getVariableCost(companyId: string, storeName: string, menuCategory: string): Promise<number | null> {
  const snapshot = await adminDb.collection(COST_COLLECTION)
    .doc(costSettingId(companyId, storeName, menuCategory)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (data?.companyId !== companyId) throw new Error("原価設定のテナントが一致しません");
  const value = Number(data?.variableCost);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

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

    const variableCost = await getVariableCost(companyId, input.storeName, input.menuCategory);
    const model = buildCouponOptimizationModel(sales, companyId, input.storeName, input.menuCategory, {}, variableCost);
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
      variableCost,
    };
  } catch (error) {
    console.error("Coupon optimization analysis failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "分析データの取得に失敗しました" };
  }
}

export async function saveCouponVariableCost(input: {
  storeName: string;
  menuCategory: string;
  variableCost: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getCurrentUserContext();
    if (!ALLOWED_ROLES.has(ctx.role)) return { success: false, error: "権限がありません" };
    const companyId = requireCompanyId(ctx);
    const storeName = input.storeName.normalize("NFKC").trim();
    const menuCategory = input.menuCategory.normalize("NFKC").trim();
    if (!storeName || !menuCategory) return { success: false, error: "店舗とメニューを選択してください" };
    if (input.variableCost != null && (!Number.isInteger(input.variableCost) || input.variableCost < 0 || input.variableCost > 10_000_000)) {
      return { success: false, error: "変動原価は0〜10,000,000円の整数で入力してください" };
    }

    const ref = adminDb.collection(COST_COLLECTION).doc(costSettingId(companyId, storeName, menuCategory));
    if (input.variableCost == null) {
      const existing = await ref.get();
      if (existing.exists && existing.data()?.companyId !== companyId) throw new Error("原価設定のテナントが一致しません");
      await ref.delete();
    } else {
      await ref.set({
        companyId,
        storeName,
        menuCategory,
        variableCost: input.variableCost,
        updatedAt: new Date(),
      }, { merge: true });
    }
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    console.error("Saving coupon variable cost failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "変動原価の保存に失敗しました" };
  }
}
