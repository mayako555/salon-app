"use server";

import { getCurrentUserContext } from "@/lib/auth-server";
import { requireFeature } from "@/lib/feature-utils";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeLineStoreSettings } from "@/lib/line-integration-settings";

export type PublicLineStoreSettings = {
  lineOaId: string;
  liffId: string;
};

export async function getPublicLineStoreSettings(): Promise<
  Record<string, PublicLineStoreSettings>
> {
  try {
    const context = await getCurrentUserContext();
    if (!context.companyId) return {};

    await requireFeature(context.companyId, "line_automation");

    const snapshot = await adminDb
      .collection("line_integrations")
      .where("companyId", "==", context.companyId)
      .get();

    const result: Record<string, PublicLineStoreSettings> = {};
    for (const document of snapshot.docs) {
      const data = document.data();
      const storeName =
        typeof data.storeName === "string" ? data.storeName.trim() : "";
      const settings = normalizeLineStoreSettings(data);

      if (storeName && settings.lineOaId && settings.liffId) {
        result[storeName] = {
          lineOaId: settings.lineOaId,
          liffId: settings.liffId,
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to load public LINE store settings:", error);
    return {};
  }
}
