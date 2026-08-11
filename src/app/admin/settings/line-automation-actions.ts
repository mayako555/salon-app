"use server";
import { setTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "@/lib/firestore-admin-wrapper";

export interface LineAutomationSettings {
  id?: string;
  tenantId: string;
  storeId?: string;
  automationEnabled: boolean;
  
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTemplate: string;
  
  thanksEnabled: boolean;
  thanksDaysAfter: number;
  thanksTemplate: string;
  
  timezone: string;
  createdAt?: any;
  updatedAt?: any;
}

const DEFAULT_LINE_AUTOMATION_SETTINGS: Omit<LineAutomationSettings, "tenantId"> = {
  automationEnabled: false,
  reminderEnabled: false,
  reminderDaysBefore: 1,
  reminderTemplate: "",
  thanksEnabled: false,
  thanksDaysAfter: 1,
  thanksTemplate: "",
  timezone: "Asia/Tokyo",
};

export async function getLineAutomationSettings(tenantId: string, storeId?: string): Promise<LineAutomationSettings> {
  // Since we are starting with tenant-level only, we will use tenantId as the doc ID
  // To support storeId in the future, we could use `${tenantId}_${storeId}`
  const docId = storeId ? `${tenantId}_${storeId}` : tenantId;
  const docRef = doc(db, "line_automation_settings", docId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...DEFAULT_LINE_AUTOMATION_SETTINGS,
      ...snapshot.data()
    } as LineAutomationSettings;
  }

  return {
    ...DEFAULT_LINE_AUTOMATION_SETTINGS,
    tenantId,
    storeId,
  };
}

export async function saveLineAutomationSettings(settings: LineAutomationSettings): Promise<{success: boolean, error?: string}> {
  try {
    const docId = settings.storeId ? `${settings.tenantId}_${settings.storeId}` : settings.tenantId;
    const docRef = doc(db, "line_automation_settings", docId);
    
    await setTenantOwnedDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      createdAt: settings.createdAt || serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save line automation settings:", error);
    return { success: false, error: error.message };
  }
}
