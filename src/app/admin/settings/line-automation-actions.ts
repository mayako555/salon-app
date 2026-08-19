"use server";
import { setTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firestore-admin-wrapper";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "@/lib/firestore-admin-wrapper";
import { getCurrentUserContext } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

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

  nextBookingEnabled: boolean;
  nextBookingTemplate: string;
  
  timezone: string;
  createdAt?: any;
  updatedAt?: any;
}

const DEFAULT_LINE_AUTOMATION_SETTINGS: Omit<LineAutomationSettings, "tenantId"> = {
  automationEnabled: false,
  reminderEnabled: false,
  reminderDaysBefore: 1,
  reminderTemplate: "{customer_name}様\n\n{store_name}です。\nご予約日のご案内です。\n\n日時：{date} {time}\nメニュー：{menu_name}\n担当：{staff_name}\n\nご来店を心よりお待ちしております。",
  thanksEnabled: false,
  thanksDaysAfter: 1,
  thanksTemplate: "{customer_name}様\n\n本日は{store_name}へご来店いただき、ありがとうございました。\nまたのご来店を心よりお待ちしております。",
  nextBookingEnabled: false,
  nextBookingTemplate: "{customer_name}様\n\n{store_name}です。\n次回のご予約が確定いたしましたのでご案内いたします。\n\n日時：{next_reservation_date} {next_reservation_time}\nメニュー：{menu_name}\n担当：{staff_name}\n\nご来店をお待ちしております。",
  timezone: "Asia/Tokyo",
};

export async function getLineAutomationSettings(tenantId: string, storeId?: string): Promise<LineAutomationSettings> {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) throw new Error("会社IDが指定されていません");
  tenantId = ctx.companyId;
  const docId = storeId ? `${tenantId}_${storeId}` : tenantId;
  const snapshot = await adminDb.collection("line_automation_settings").doc(docId).get();

  if (snapshot.exists) {
    const data = snapshot.data() || {};
    return {
      id: snapshot.id,
      ...DEFAULT_LINE_AUTOMATION_SETTINGS,
      ...data,
      reminderTemplate: data.reminderTemplate?.trim() || DEFAULT_LINE_AUTOMATION_SETTINGS.reminderTemplate,
      thanksTemplate: data.thanksTemplate?.trim() || DEFAULT_LINE_AUTOMATION_SETTINGS.thanksTemplate,
      nextBookingTemplate: data.nextBookingTemplate?.trim() || DEFAULT_LINE_AUTOMATION_SETTINGS.nextBookingTemplate,
      createdAt: data.createdAt?.toDate?.().toISOString?.() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || null,
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
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || !["systemOwner", "companyOwner", "admin"].includes(ctx.role)) {
      return { success: false, error: "権限がありません" };
    }
    settings = { ...settings, tenantId: ctx.companyId };
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
