"use server";

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUserContext } from "@/lib/auth-server";
import { Timestamp } from "firebase-admin/firestore";
import { 
  StaffSocialInsuranceHistory, 
  StaffResidentTaxSchedule,
  StaffIncomeTaxHistory 
} from "@/types/payroll";
import { getTenantCollection, getTenantDoc } from "@/lib/tenant-utils";

// --- Helpers ---

async function checkAdminAccess(staffTenantId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("Unauthorized");
  if ((ctx.role as any) !== "systemOwner" && (ctx.role as any) !== "payrollMasterAdmin" && ctx.companyId !== staffTenantId) {
    throw new Error("Unauthorized tenant access");
  }
  return ctx;
}

// --- Social Insurance History ---

export async function addSocialInsuranceHistory(data: Omit<StaffSocialInsuranceHistory, "id" | "created_at" | "updated_at" | "updated_by">) {
  const ctx = await checkAdminAccess(data.tenant_id);
  const now = Timestamp.now();
  
  const ref = await adminDb.collection("staff_social_insurance_history").add({
    ...data,
    companyId: ctx.companyId,
    created_at: now,
    updated_at: now,
    updated_by: ctx.uid,
  });
  
  return ref.id;
}

export async function getSocialInsuranceHistories(staffId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) return [];

  const snapshot = await getTenantCollection("staff_social_insurance_history", ctx)
    .where("staff_id", "==", staffId)
    .orderBy("effective_from", "desc")
    .get();

  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

// --- Resident Tax Schedules ---

export async function addResidentTaxSchedule(data: Omit<StaffResidentTaxSchedule, "id" | "created_at" | "updated_at" | "updated_by">) {
  const ctx = await checkAdminAccess(data.tenant_id);
  const now = Timestamp.now();
  
  const ref = await adminDb.collection("staff_resident_tax_schedules").add({
    ...data,
    companyId: ctx.companyId,
    created_at: now,
    updated_at: now,
    updated_by: ctx.uid,
  });
  
  return ref.id;
}

export async function getResidentTaxSchedules(staffId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) return [];

  const snapshot = await getTenantCollection("staff_resident_tax_schedules", ctx)
    .where("staff_id", "==", staffId)
    .orderBy("effective_from", "desc")
    .get();

  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

// --- Income Tax History ---

export async function addIncomeTaxHistory(data: Omit<StaffIncomeTaxHistory, "id" | "created_at" | "updated_at" | "updated_by">) {
  const ctx = await checkAdminAccess(data.tenant_id);
  const now = Timestamp.now();
  
  const ref = await adminDb.collection("staff_income_tax_history").add({
    ...data,
    companyId: ctx.companyId,
    created_at: now,
    updated_at: now,
    updated_by: ctx.uid,
  });
  
  return ref.id;
}

export async function getIncomeTaxHistories(staffId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) return [];

  const snapshot = await getTenantCollection("staff_income_tax_history", ctx)
    .where("staff_id", "==", staffId)
    .orderBy("effective_from", "desc")
    .get();

  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}
