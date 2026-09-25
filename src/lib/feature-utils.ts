import { FeatureKey, ensureFeatureDefaults } from "@/types/master";

export async function isFeatureEnabled(companyId: string | undefined, feature: FeatureKey) {
  if (!companyId) return false;

  const { adminDb } = await import("@/lib/firebase-admin");
  const snap = await adminDb.collection("companies").doc(companyId).get();
  if (!snap.exists) return false;

  const data = snap.data();
  const isSystemOwner = data?.companyType === "system_owner";
  return Boolean(ensureFeatureDefaults(data?.features, isSystemOwner)[feature]);
}

export async function requireFeature(companyId: string | undefined, feature: FeatureKey) {
  if (!companyId) {
    throw new Error(`Permission denied: Feature ${feature} is disabled (No company ID)`);
  }
  
  if (!(await isFeatureEnabled(companyId, feature))) {
    throw new Error(`Permission denied: Feature ${feature} is disabled for this company`);
  }
  
  return true;
}
