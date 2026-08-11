import { adminDb } from "./firebase-admin";
import { UserContext } from "./auth-server";

/**
 * Returns a Firestore Query restricted to the user's tenant.
 * SystemOwners (when not impersonating) get unrestricted access.
 */
export function getTenantCollection(collectionName: string, ctx: UserContext) {
  if (!ctx.companyId) throw new Error("Unauthorized: No company ID found");
  return adminDb.collection(collectionName).where("companyId", "==", ctx.companyId);
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
  const data = snap.data();
  
  if (data?.companyId !== ctx.companyId && data?.tenant_id !== ctx.companyId) {
    throw new Error(`Unauthorized tenant access: Document belongs to ${data?.companyId || data?.tenant_id}`);
  }
  
  return snap;
}
