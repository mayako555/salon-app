import { adminDb } from "./firebase-admin";
import type { UserContext } from "./authorization";
import { assertDocumentTenant, isUnscopedSystemOwner, requireCompanyId } from "./authorization";

/**
 * Returns a Firestore Query restricted to the user's tenant.
 * SystemOwners (when not impersonating) get unrestricted access.
 */
export function getTenantCollection(collectionName: string, ctx: UserContext) {
  const collection = adminDb.collection(collectionName);
  if (isUnscopedSystemOwner(ctx)) return collection;
  return collection.where("companyId", "==", requireCompanyId(ctx));
}

/**
 * Validates that a specific document belongs to the user's tenant.
 * Returns the DocumentSnapshot if authorized, or throws an error if unauthorized.
 */
export async function getTenantDoc(collectionName: string, docId: string, ctx: UserContext) {
  const snap = await adminDb.collection(collectionName).doc(docId).get();
  if (!snap.exists) {
    throw new Error("Document not found");
  }
  assertDocumentTenant(ctx, snap.data() || {});
  
  return snap;
}
