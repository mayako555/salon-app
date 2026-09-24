"use server";

import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";
import { getCompanyScopedCollection, getCompanyScopedDoc } from "./tenant-utils";
import { requireCompanyId } from "./authorization";
import { FieldValue } from "firebase-admin/firestore";

export type StaffTarget = {
  staff_id: string;
  month: string; // YYYY-MM
  target: number;
  updated_at?: any;
};

const TARGETS_COLLECTION = "staff_targets";

/**
 * 特定の月の全スタッフの目標を取得する
 */
export async function getMonthlyStaffTargets(month: string): Promise<Record<string, number>> {
  try {
    const ctx = await getCurrentUserContext();
    requireCompanyId(ctx);
    const [snapshot, staffSnapshot] = await Promise.all([
      getCompanyScopedCollection(TARGETS_COLLECTION, ctx).where("month", "==", month).get(),
      getCompanyScopedCollection("staff_profiles", ctx).get(),
    ]);
    
    const targets: Record<string, number> = {};
    snapshot.docs.forEach((d: any) => {
      const data = d.data();
      targets[data.staff_id] = data.target;
    });

    // 旧データにはcompanyIdがないため、現在の会社に所属するスタッフIDと
    // 一致するものだけを読み取り互換として採用する。DB自体は変更しない。
    const allowedStaffIds = new Set(staffSnapshot.docs.map((d: any) => d.id));
    const legacySnapshot = await adminDb.collection(TARGETS_COLLECTION)
      .where("month", "==", month)
      .get();
    legacySnapshot.docs.forEach((d: any) => {
      const data = d.data();
      if (!data.companyId && allowedStaffIds.has(data.staff_id) && targets[data.staff_id] === undefined) {
        targets[data.staff_id] = data.target;
      }
    });

    return targets;
  } catch (error) {
    console.error("Error fetching staff targets:", error);
    return {};
  }
}

/**
 * スタッフの目標を保存する
 */
export async function updateStaffTarget(staffId: string, month: string, target: number) {
  try {
    const ctx = await getCurrentUserContext();
    const companyId = requireCompanyId(ctx);
    await getCompanyScopedDoc("staff_profiles", staffId, ctx);

    const docId = `${companyId}_${staffId}_${month}`;
    await adminDb.collection(TARGETS_COLLECTION).doc(docId).set({
      companyId,
      staff_id: staffId,
      month,
      target,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating staff target:", error);
    return { success: false, error: error.message };
  }
}
