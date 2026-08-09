"use server";
import { setTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const SETTINGS_COLLECTION = "system_settings";

export type PayrollRules = {
  nominationFeeRate: number; // 指名料還元率 (例: 1.0 = 100%)
  productSalesRate: number;  // 店販還元率 (例: 0.1 = 10%)
  baseHourlyWage: number;    // 基本時給
  // ... other global rules
};

export async function getPayrollRules(): Promise<PayrollRules> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "payroll_rules");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PayrollRules;
    }
    // Default fallback
    return {
      nominationFeeRate: 1.0,
      productSalesRate: 0.1,
      baseHourlyWage: 1001,
    };
  } catch (error) {
    console.error("Error fetching payroll rules:", error);
    return {
      nominationFeeRate: 1.0,
      productSalesRate: 0.1,
      baseHourlyWage: 1001,
    };
  }
}

export async function updatePayrollRules(rules: PayrollRules) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "payroll_rules");
    await setTenantOwnedDoc(docRef, {
      ...rules,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    revalidatePath("/admin/master/system/payroll-rules");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating payroll rules:", error);
    return { success: false, error: error.message };
  }
}

export type AISettings = {
  sarimaxDefaultMonths: number;
  regressionBaseWeight: number;
  enableExternalFactors: boolean;
};

export async function getAISettings(): Promise<AISettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "ai_settings");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AISettings;
    }
    // Default fallback
    return {
      sarimaxDefaultMonths: 24,
      regressionBaseWeight: 1.0,
      enableExternalFactors: true,
    };
  } catch (error) {
    console.error("Error fetching ai settings:", error);
    return {
      sarimaxDefaultMonths: 24,
      regressionBaseWeight: 1.0,
      enableExternalFactors: true,
    };
  }
}

export async function updateAISettings(settings: AISettings) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "ai_settings");
    await setTenantOwnedDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    revalidatePath("/admin/master/system/ai-settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating ai settings:", error);
    return { success: false, error: error.message };
  }
}
