import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";
import { assertDocumentTenant, isUnscopedSystemOwner, withTenantCompanyId } from "./authorization";

// We accept any docRef/colRef from Client SDK, relying on their `.path` property.

export async function assertTenantOwnership(docRef: any) {
  const ctx = await getCurrentUserContext();
  
  if (isUnscopedSystemOwner(ctx)) {
    return { snap: null, data: null, ctx };
  }

  const snap = await adminDb.doc(docRef.path).get();
  if (!snap.exists) {
    throw new Error("Document not found");
  }

  const data = snap.data() || {};
  assertDocumentTenant(ctx, data);

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
  const dataWithCompany = withTenantCompanyId(ctx, data);
  return adminDb.collection(colRef.path).add(dataWithCompany);
}

export async function setTenantOwnedDoc(docRef: any, data: any, options?: { merge: boolean }) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = withTenantCompanyId(ctx, data);
  if (isUnscopedSystemOwner(ctx)) {
    return adminDb.doc(docRef.path).set(dataWithCompany, { merge: options?.merge ?? false });
  }
  
  // Check existing
  const snap = await adminDb.doc(docRef.path).get();
  if (snap.exists) {
    assertDocumentTenant(ctx, snap.data() || {});
  }
  return adminDb.doc(docRef.path).set(dataWithCompany, { merge: options?.merge ?? false });
}
