"use server";
import { addTenantOwnedDoc } from "@/lib/tenant-ownership";

import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocsUnfiltered, 
  addDocUnfiltered, 
  updateDocUnfiltered, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from "@/lib/firestore-admin-wrapper";
import { revalidatePath } from "next/cache";
import { generateDefaultFeatures } from "@/types/master";
import { addAuditLog } from "@/app/audit/actions";

export type CompanyTenant = {
  id: string;
  name: string;
  plan: string;
  status: "active" | "inactive";
  fee?: number;
  startDate?: string;
  contractPdfUrl?: string;
  termsPdfUrl?: string;
  createdAt?: any;
  updatedAt?: any;
  adminEmails?: string[];
  schoolEnabled?: boolean;
  schoolName?: string;
};

const COMPANIES_COLLECTION = "companies";

// Get all tenants (only systemOwner should call this, protected by UI usually but ideally needs server check)
export async function getTenants() {
  try {
    const colRef = collection(db, COMPANIES_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocsUnfiltered(q);
    
    const { adminDb } = require("@/lib/firebase-admin");
    const profilesSnap = await adminDb.collection("staff_profiles").where("role", "==", "companyOwner").get();
    const emailsByCompany: Record<string, string[]> = {};
    profilesSnap.forEach((doc: any) => {
      const data = doc.data();
      if (data.companyId && data.email) {
        if (!emailsByCompany[data.companyId]) emailsByCompany[data.companyId] = [];
        emailsByCompany[data.companyId].push(data.email);
      }
    });

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      adminEmails: emailsByCompany[doc.id] || []
    })) as unknown as CompanyTenant[];
  } catch (error) {
    console.error("Error fetching tenants:", error);
    // If collection doesn't exist or index missing, might fail. 
    // Fallback to simple getDocsUnfiltered
    try {
      const snap = await getDocsUnfiltered(collection(db, COMPANIES_COLLECTION));
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        adminEmails: []
      })) as unknown as CompanyTenant[];
    } catch (e) {
      console.error("Fallback error:", e);
      return [];
    }
  }
}

// Add new tenant
export async function addTenant(payload: Omit<CompanyTenant, "id" | "createdAt" | "updatedAt">) {
  try {
    const colRef = collection(db, COMPANIES_COLLECTION);
    const defaultFeatures = generateDefaultFeatures(false);
    const docRef = await addTenantOwnedDoc(colRef, {
      ...payload,
      features: defaultFeatures,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Add audit log
    await addAuditLog({
      table_name: "companies",
      record_id: docRef.id,
      action: "INSERT",
      old_data: null,
      new_data: { features: defaultFeatures },
      actor: "system"
    });
    
    revalidatePath("/admin/master/system/tenants");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding tenant:", error);
    return { success: false, error: error.message };
  }
}

// Update existing tenant
export async function updateTenant(id: string, payload: Partial<Omit<CompanyTenant, "id" | "createdAt" | "updatedAt">>) {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, id);
    await updateDocUnfiltered(docRef, {
      ...payload,
      updatedAt: serverTimestamp()
    });
    
    revalidatePath("/admin/master/system/tenants");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating tenant:", error);
    return { success: false, error: error.message };
  }
}

// Create initial admin user for a tenant
export async function createTenantAdmin(payload: { email: string, password: string, name: string, companyId: string }) {
  try {
    // Dynamically import admin SDK so it doesn't break client components during build
    const { adminAuth, adminDb } = require("@/lib/firebase-admin");

    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: payload.email,
      password: payload.password,
      displayName: payload.name,
    });

    // 2. Create user document in Firestore with role and companyId
    await adminDb.collection("staff_profiles").doc(userRecord.uid).set({
      email: payload.email,
      name: payload.name,
      role: "companyOwner", // Initial owner role for the tenant
      companyId: payload.companyId,
      createdAt: new Date()
    });

    const { syncUserDoc } = require("@/lib/user-sync");
    const syncResult = await syncUserDoc(userRecord.uid, {
      role: "companyOwner",
      companyId: payload.companyId,
      email: payload.email,
      active: true,
      salonIds: []
    });
    if (!syncResult.success) {
      throw new Error(`権限同期に失敗しました: ${syncResult.error}`);
    }

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating tenant admin:", error);
    return { success: false, error: error.message };
  }
}

export async function getTenantAdmins(companyId: string) {
  try {
    const { adminDb } = require("@/lib/firebase-admin");
    const snapshot = await adminDb.collection("staff_profiles")
      .where("companyId", "==", companyId)
      .get();
    
    const users: any[] = [];
    snapshot.forEach((doc: any) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, users };
  } catch (error: any) {
    console.error("Error fetching tenant admins:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTenantAdmin(uid: string, payload: { email?: string, password?: string, name?: string }) {
  try {
    const { adminAuth, adminDb } = require("@/lib/firebase-admin");
    
    const authUpdates: any = {};
    if (payload.email) authUpdates.email = payload.email;
    if (payload.password) authUpdates.password = payload.password;
    if (payload.name) authUpdates.displayName = payload.name;

    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(uid, authUpdates);
    }

    const dbUpdates: any = {};
    if (payload.email) dbUpdates.email = payload.email;
    if (payload.name) dbUpdates.name = payload.name;

    if (Object.keys(dbUpdates).length > 0) {
      await adminDb.collection("staff_profiles").doc(uid).update(dbUpdates);
    }

    const updatedProfileSnap = await adminDb.collection("staff_profiles").doc(uid).get();
    if (updatedProfileSnap.exists) {
      const data = updatedProfileSnap.data();
      const { syncUserDoc } = require("@/lib/user-sync");
      const syncResult = await syncUserDoc(uid, {
        role: data.role,
        companyId: data.companyId,
        email: data.email,
        active: data.is_active !== false && data.employment_status !== "retired",
        salonIds: data.salonIds || []
      });
      if (!syncResult.success) {
        throw new Error(`権限同期に失敗しました: ${syncResult.error}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating tenant admin:", error);
    return { success: false, error: error.message };
  }
}
