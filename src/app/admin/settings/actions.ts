"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
