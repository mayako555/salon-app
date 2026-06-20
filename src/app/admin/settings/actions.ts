"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, getDocs } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export type StoreReservationSettings = {
  startHour: number;
  endHour: number;
  slotDuration: number; // in minutes (e.g. 30, 15, 5)
};

export type ReservationSettings = {
  stores: Record<string, StoreReservationSettings>;
};

const DEFAULT_SETTINGS: ReservationSettings = {
  stores: {
    "六甲": { startHour: 8, endHour: 22, slotDuration: 30 },
    "神戸": { startHour: 8, endHour: 22, slotDuration: 15 },
    "元町": { startHour: 8, endHour: 22, slotDuration: 5 },
    "共通": { startHour: 8, endHour: 22, slotDuration: 30 }, // Fallback
  }
};

const SETTINGS_DOC_ID = "reservation_settings";
const SETTINGS_COLLECTION = "system_settings";

export async function getReservationSettings(): Promise<ReservationSettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Merge with default settings to ensure all stores have at least default settings
      return {
        stores: {
          ...DEFAULT_SETTINGS.stores,
          ...(data.stores || {})
        }
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to fetch reservation settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveReservationSettings(settings: ReservationSettings) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, settings, { merge: true });
    revalidatePath("/reservations");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save reservation settings:", error);
    return { success: false, error: error.message };
  }
}

export type LineSettingsMap = Record<string, string>;

export async function getLineSettings(): Promise<LineSettingsMap> {
  try {
    const colRef = collection(db, "line_integrations");
    const snapshot = await getDocs(colRef);
    const result: LineSettingsMap = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.storeName && data.channelAccessToken) {
        result[data.storeName] = data.channelAccessToken;
      }
    });
    return result;
  } catch (error) {
    console.error("Failed to fetch LINE settings:", error);
    return {};
  }
}

export async function saveLineSettings(storeName: string, channelAccessToken: string) {
  try {
    const q = query(collection(db, "line_integrations"));
    const snapshot = await getDocs(q);
    
    // Find if the store already has an integration
    let docId = "";
    snapshot.docs.forEach(d => {
      if (d.data().storeName === storeName) {
        docId = d.id;
      }
    });

    if (docId) {
      await setDoc(doc(db, "line_integrations", docId), {
        storeName,
        channelAccessToken
      }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "line_integrations")), {
        storeName,
        channelAccessToken
      });
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save LINE settings:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompanySettings(companyId: string) {
  try {
    const docRef = doc(db, "companies", companyId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return { attendanceRule: "simple" };
  } catch (error) {
    console.error("Failed to get company settings:", error);
    return { attendanceRule: "simple" };
  }
}

export async function saveCompanyAttendanceRule(companyId: string, rule: "jasminelash" | "simple") {
  try {
    const docRef = doc(db, "companies", companyId);
    await setDoc(docRef, { attendanceRule: rule }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save attendance rule:", error);
    return { success: false, error: error.message };
  }
}

export async function getKioskSettings(companyId: string) {
  try {
    const snap = await getDocs(query(collection(db, "kiosk_settings")));
    
    // Fallback if the query is not matching due to index
    const settings: Record<string, any> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.companyId === companyId) {
        settings[data.storeName] = {
          token: data.token,
          enabled: data.enabled ?? false
        };
      }
    });
    return settings;
  } catch (error) {
    console.error("Failed to get kiosk settings:", error);
    return {};
  }
}

export async function saveKioskSettings(companyId: string, storeName: string, token: string, enabled: boolean) {
  try {
    const q = query(collection(db, "kiosk_settings"));
    const snap = await getDocs(q);
    
    let docId = "";
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.companyId === companyId && data.storeName === storeName) {
        docId = d.id;
      }
    });

    if (docId) {
      await setDoc(doc(db, "kiosk_settings", docId), {
        companyId,
        storeName,
        token,
        enabled
      }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "kiosk_settings")), {
        companyId,
        storeName,
        token,
        enabled
      });
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save kiosk settings:", error);
    return { success: false, error: error.message };
  }
}
