"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FeatureKey, FeatureSettings } from "@/types/master";
import { getCurrentUserContext } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function saveCompanyFeatures(
  targetCompanyId: string, 
  features: FeatureSettings
) {
  // 1. Authenticate and Authorize securely from session
  const ctx = await getCurrentUserContext();
  
  if (ctx.role !== "systemOwner") {
    throw new Error("Forbidden: Caller is not a systemOwner");
  }
  
  const callerUid = ctx.uid;

  // 2. Verify target company exists
  const companyRef = adminDb.collection("companies").doc(targetCompanyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new Error("Company not found");
  }

  const beforeFeatures = companySnap.data()?.features || {};

  // 3. Update features
  await companyRef.update({
    features,
    updatedAt: new Date()
  });

  // 4. Create Audit Log
  const auditRef = adminDb.collection("audit_logs").doc();
  await auditRef.set({
    targetCompanyId,
    changedByUserId: callerUid,
    action: "UPDATE_FEATURES",
    before: beforeFeatures,
    after: features,
    changedAt: new Date(),
    module: "system"
  });

  revalidatePath("/");
  return { success: true };
}
