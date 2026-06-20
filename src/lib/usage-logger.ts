import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";

export type FeatureType = 
  | "evaluation"
  | "shift"
  | "manual"
  | "task"
  | "reservation"
  | "medical_record"
  | "line_message"
  | "inventory"
  | "sales"
  | "analytics";

export async function logFeatureUsage(companyId: string | null | undefined, plan: string | undefined, feature: FeatureType, details?: any) {
  // ログの過剰な肥大化を防ぐため、今回はTest/Betaプラン（または特定のトラッキング対象）のみ記録する
  if (!companyId || plan !== "Test") return;

  try {
    const colRef = collection(db, "feature_usage_logs");
    await addDoc(colRef, {
      companyId,
      feature,
      details: details || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log feature usage:", error);
  }
}

// クライアント側からも呼び出せる簡易ラッパー（サーバーコンポーネント用アクションとは別）
export async function getUsageStats(companyId: string) {
  try {
    const colRef = collection(db, "feature_usage_logs");
    const q = query(colRef, where("companyId", "==", companyId));
    const snap = await getDocs(q);
    
    const stats: Record<string, number> = {};
    snap.forEach(doc => {
      const f = doc.data().feature;
      stats[f] = (stats[f] || 0) + 1;
    });
    return stats;
  } catch (error) {
    console.error("Failed to fetch usage stats:", error);
    return {};
  }
}
