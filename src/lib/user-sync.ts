import { adminDb } from "./firebase-admin";

export interface SyncUserData {
  role: string;
  companyId: string;
  email?: string;
  active: boolean;
  salonIds?: string[];
}

/**
 * users/{uid} は Security Rules 検証用の「読み取り専用プロジェクション（影データ）」です。
 * staff_profiles を正 (SSOT) とし、権限や状態が変更された際はこの関数で即時同期します。
 */
export async function syncUserDoc(uid: string, data: SyncUserData): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    console.error("[syncUserDoc] UID is missing. Cannot sync user doc.");
    return { success: false, error: "UID is missing" };
  }

  try {
    const docRef = adminDb.collection("users").doc(uid);
    // Idempotent: set with merge: true guarantees the fields are updated without failing if it already exists or not.
    await docRef.set({
      role: data.role,
      companyId: data.companyId,
      email: data.email || null,
      active: data.active,
      accessibleStoreIds: data.salonIds || [], // Security rules might use this for store-level access
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`[syncUserDoc] Successfully synced users/${uid} with role=${data.role}, active=${data.active}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[syncUserDoc] Failed to sync users/${uid}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * ユーザーが削除された場合は、プロジェクションデータも完全に削除します。
 */
export async function deleteUserDoc(uid: string): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: "UID is missing" };
  }

  try {
    const docRef = adminDb.collection("users").doc(uid);
    await docRef.delete();
    console.log(`[deleteUserDoc] Successfully deleted users/${uid}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[deleteUserDoc] Failed to delete users/${uid}:`, error);
    return { success: false, error: error.message };
  }
}
