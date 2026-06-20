"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getCurrentUserContext } from "@/lib/auth-server";

export interface AdoptionProgress {
  storeInfo: boolean;
  businessHours: boolean;
  menu: boolean;
  staff: boolean;
  payroll: boolean;
  lineSettings: boolean;
  salesInputStarted: boolean;
  karteUsageStarted: boolean;
}

export const defaultAdoptionProgress: AdoptionProgress = {
  storeInfo: false,
  businessHours: false,
  menu: false,
  staff: false,
  payroll: false,
  lineSettings: false,
  salesInputStarted: false,
  karteUsageStarted: false,
};

export async function getCompanySetupStatus() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) {
      return { success: false, error: "Company ID not found" };
    }

    const companyRef = doc(db, "companies", ctx.companyId);
    const snap = await getDoc(companyRef);
    
    if (!snap.exists()) {
      return { success: true, data: { progress: defaultAdoptionProgress, rate: 0, isComplete: false } };
    }

    const data = snap.data();
    const progress: AdoptionProgress = {
      ...defaultAdoptionProgress,
      ...(data.adoptionProgress || {})
    };

    const values = Object.values(progress);
    const completedCount = values.filter(Boolean).length;
    const rate = Math.round((completedCount / values.length) * 100);

    return { 
      success: true, 
      data: { 
        progress, 
        rate, 
        isComplete: data.is_setup_complete || false 
      } 
    };
  } catch (error: any) {
    console.error("Failed to get setup status:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAdoptionProgress(field: keyof AdoptionProgress, value: boolean) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || ctx.companyId === "company_default") {
       return { success: false, error: "Cannot update default company" };
    }

    const companyRef = doc(db, "companies", ctx.companyId);
    const updateData: Record<string, any> = {
      [`adoptionProgress.${field}`]: value
    };

    await updateDoc(companyRef, updateData);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update adoption progress:", error);
    return { success: false, error: error.message };
  }
}

// Record first time usage
export async function recordFirstTimeUsage(field: 'firstLoginAt' | 'firstReservationAt' | 'firstKarteAt' | 'firstSalesAt' | 'firstLineSentAt') {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || ctx.companyId === "company_default") {
       return { success: false };
    }

    const companyRef = doc(db, "companies", ctx.companyId);
    const snap = await getDoc(companyRef);
    if (!snap.exists()) return { success: false };

    const data = snap.data();
    if (!data[field]) {
      await updateDoc(companyRef, {
        [field]: serverTimestamp(),
        lastUsedAt: serverTimestamp()
      });
      
      // Also update adoption progress flags if applicable
      if (field === 'firstSalesAt') {
        await updateAdoptionProgress('salesInputStarted', true);
      } else if (field === 'firstKarteAt') {
        await updateAdoptionProgress('karteUsageStarted', true);
      } else if (field === 'firstLineSentAt') {
        await updateAdoptionProgress('lineSettings', true);
      }
    } else {
      // Just update lastUsedAt
      await updateDoc(companyRef, {
        lastUsedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error(`Failed to record first time usage for ${field}:`, error);
    return { success: false };
  }
}

export async function recordLogin() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || ctx.companyId === "company_default") {
       return { success: false };
    }

    const companyRef = doc(db, "companies", ctx.companyId);
    const snap = await getDoc(companyRef);
    if (snap.exists()) {
      const data = snap.data();
      const updates: any = {
        lastLoginAt: serverTimestamp()
      };
      if (!data.firstLoginAt) {
        updates.firstLoginAt = serverTimestamp();
      }
      await updateDoc(companyRef, updates);
    }
  } catch (error) {
    console.error("Failed to record login:", error);
  }
}
