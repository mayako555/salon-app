import { FeatureKey, FeatureSettings, ensureFeatureDefaults } from "@/types/master";

export async function requireFeature(companyId: string | undefined, feature: FeatureKey) {
  if (!companyId) {
    throw new Error(`Permission denied: Feature ${feature} is disabled (No company ID)`);
  }
  
  const { adminDb } = await import("@/lib/firebase-admin");
  const docRef = adminDb.collection("companies").doc(companyId);
  const snap = await docRef.get();
  
  if (!snap.exists) {
    throw new Error(`Permission denied: Feature ${feature} is disabled (Company not found)`);
  }
  
  const data = snap.data();
  const isSystemOwner = data?.companyType === "system_owner";
  
  // ensureFeatureDefaults を使って、未定義のキーを安全に補完
  const features = ensureFeatureDefaults(data?.features, isSystemOwner);
  
  if (!features[feature]) {
    throw new Error(`Permission denied: Feature ${feature} is disabled for this company`);
  }
  
  return true;
}
