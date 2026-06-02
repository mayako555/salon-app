import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export interface LineIntegrationConfig {
  storeName: string;
  channelAccessToken: string;
  channelSecret?: string;
  companyId?: string;
}

export async function getLineConfig(storeName: string): Promise<LineIntegrationConfig | null> {
  try {
    const q = query(
      collection(db, "line_integrations"),
      where("storeName", "==", storeName)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return null;
    }
    
    return snap.docs[0].data() as LineIntegrationConfig;
  } catch (error) {
    console.error("Failed to fetch LINE config for store:", storeName, error);
    return null;
  }
}
