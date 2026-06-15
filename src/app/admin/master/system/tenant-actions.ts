"use server";

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

export type CompanyTenant = {
  id: string;
  name: string;
  plan: string;
  status: "active" | "inactive";
  createdAt?: any;
  updatedAt?: any;
};

const COMPANIES_COLLECTION = "companies";

// Get all tenants (only systemOwner should call this, protected by UI usually but ideally needs server check)
export async function getTenants() {
  try {
    const colRef = collection(db, COMPANIES_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CompanyTenant[];
  } catch (error) {
    console.error("Error fetching tenants:", error);
    // If collection doesn't exist or index missing, might fail. 
    // Fallback to simple getDocs
    try {
      const snap = await getDocs(collection(db, COMPANIES_COLLECTION));
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyTenant[];
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
    const docRef = await addDoc(colRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
    await updateDoc(docRef, {
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
    await adminDb.collection("users").doc(userRecord.uid).set({
      email: payload.email,
      name: payload.name,
      role: "companyOwner", // Initial owner role for the tenant
      companyId: payload.companyId,
      createdAt: new Date()
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating tenant admin:", error);
    return { success: false, error: error.message };
  }
}

export async function getTenantAdmins(companyId: string) {
  try {
    const { adminDb } = require("@/lib/firebase-admin");
    const snapshot = await adminDb.collection("users")
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
      await adminDb.collection("users").doc(uid).update(dbUpdates);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating tenant admin:", error);
    return { success: false, error: error.message };
  }
