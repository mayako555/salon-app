import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";

// We accept any docRef/colRef from Client SDK, relying on their `.path` property.

export async function assertTenantOwnership(docRef: any) {
  const ctx = await getCurrentUserContext();
  
  if (ctx.role === "systemOwner" && !ctx.isImpersonating) {
    return { snap: null, data: null, ctx };
  }

  if (!ctx.companyId) {
    throw new Error("Unauthorized: Company ID is missing in context.");
  }

  const snap = await adminDb.doc(docRef.path).get();
  if (!snap.exists) {
    throw new Error("Document not found");
  }

  const data = snap.data();
  if (data?.companyId !== ctx.companyId && data?.tenant_id !== ctx.companyId) {
    throw new Error("Unauthorized tenant access: Document belongs to a different tenant");
  }

  return { snap, data, ctx };
}

export async function getTenantOwnedDoc(docRef: any) {
  await assertTenantOwnership(docRef);
  return adminDb.doc(docRef.path).get();
}

/**
 * 所有権を確認した上でドキュメントを更新します。
 */
export async function updateTenantOwnedDoc(docRef: any, updateData: any) {
  await assertTenantOwnership(docRef);
  return adminDb.doc(docRef.path).update(updateData);
}

export async function deleteTenantOwnedDoc(docRef: any) {
  await assertTenantOwnership(docRef);
  return adminDb.doc(docRef.path).delete();
}

/**
 * Store権限も確認した上で更新します。
 */
export async function updateStoreOwnedDoc(docRef: any, updateData: any) {
  const { data, ctx } = await assertTenantOwnership(docRef);
  
  if (ctx && typeof ctx === "object" && ctx.role !== "systemOwner") {
    const storeId = data?.storeId || data?.storeName;
    if (storeId && ctx.role !== "companyOwner" && ctx.role !== "admin") {
      if (ctx.salonIds && !ctx.salonIds.includes(storeId)) {
          throw new Error("Unauthorized store access: You don't have permission for this store");
      }
    }
  }

  return adminDb.doc(docRef.path).update(updateData);
}

export async function addTenantOwnedDoc(colRef: any, data: any) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = { ...data };
  if (ctx.role === "systemOwner" && !ctx.isImpersonating) {
    return adminDb.collection(colRef.path).add(dataWithCompany);
  }
  if (!ctx.companyId) throw new Error("Unauthorized");
  dataWithCompany.companyId = ctx.companyId;
  return adminDb.collection(colRef.path).add(dataWithCompany);
}

export async function setTenantOwnedDoc(docRef: any, data: any, options?: { merge: boolean }) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = { ...data };
  if (ctx.role === "systemOwner" && !ctx.isImpersonating) {
    return adminDb.doc(docRef.path).set(dataWithCompany, { merge: options?.merge ?? false });
  }
  
  if (!ctx.companyId) throw new Error("Unauthorized");
  dataWithCompany.companyId = ctx.companyId;
  
  // Check existing
  const snap = await adminDb.doc(docRef.path).get();
  if (snap.exists) {
    const existingData = snap.data();
    if (existingData?.companyId !== ctx.companyId && existingData?.tenant_id !== ctx.companyId) {
      throw new Error("Unauthorized: Document belongs to a different tenant");
    }
  }
  return adminDb.doc(docRef.path).set(dataWithCompany, { merge: options?.merge ?? false });
}
