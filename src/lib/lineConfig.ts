import { adminDb } from "./firebase-admin";

export interface LineIntegrationConfig {
  storeName: string;
  channelAccessToken: string;
  channelSecret?: string;
  companyId?: string;
}

export async function getLineConfig(storeName: string, companyId: string): Promise<LineIntegrationConfig | null> {
  try {
    const snap = await adminDb.collection("line_integrations")
      .where("companyId", "==", companyId)
      .where("storeName", "==", storeName)
      .limit(1)
      .get();
    
    if (snap.empty) {
      return null;
    }
    
    return snap.docs[0].data() as LineIntegrationConfig;
  } catch (error) {
    console.error("Failed to fetch LINE config for store:", storeName, error);
    return null;
  }
}
