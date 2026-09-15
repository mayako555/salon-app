import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "./firebase-admin";
import { requireFeature } from "./feature-utils";
import { FeatureKey } from "@/types/master";
import type { UserContext, UserRole } from "./authorization";

export type { UserContext, UserRole } from "./authorization";
export { verifyPermission } from "./authorization";

/**
 * すべてのサーバーアクションの先頭で呼び出し、現在のユーザーコンテキストを取得する
 */
export async function getCurrentUserContext(): Promise<UserContext> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    redirect("/login");
  }

  try {
    // セッショントークンを検証
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);
    const uid = decodedClaims.uid;
    const email = decodedClaims.email;

    // UID is the authoritative identity. Email lookup is retained only for
    // legacy profiles that have not yet been backfilled with a UID.
    let snapshot = await adminDb.collection("staff_profiles").where("uid", "==", uid).limit(1).get();
    if (snapshot.empty && email) {
      snapshot = await adminDb.collection("staff_profiles").where("email", "==", email).limit(1).get();
    }
    
    if (!snapshot || snapshot.empty) {
      // No profile found in DB, fallback to guest (same as frontend auth-context)
      return {
        uid,
        role: "guest",
        companyId: undefined, // guest has no company constraint initially
        salonIds: [],
        schoolEnabled: false,
        schoolName: "",
      };
    }

    const userData = snapshot.docs[0]?.data();
    if (!userData) {
      throw new Error("ユーザーデータが空です (Empty User Data)");
    }

    const role = (userData?.role as UserRole) || "staff";
    let companyId = userData?.companyId;

    let isImpersonating = false;
    let originalSystemOwnerUid: string | undefined = undefined;

    if (role === "systemOwner") {
      const impCookie = cookieStore.get("impersonated_company_id")?.value;
      if (impCookie) {
        companyId = impCookie;
        isImpersonating = true;
        originalSystemOwnerUid = uid;
      }
    }

    if (!companyId && role !== "systemOwner") {
      throw new Error("会社情報が未設定です (Company ID missing)");
    }
    
    let schoolEnabled = false;
    let schoolName = "";
    if (companyId) {
      try {
        const companySnap = await adminDb.collection("companies").doc(companyId).get();
        if (companySnap.exists) {
          schoolEnabled = !!companySnap.data()?.schoolEnabled;
          schoolName = companySnap.data()?.schoolName || "";
        }
      } catch (e) {
        console.error("Failed to fetch company info in auth-server:", e);
      }
    }

    return {
      uid,
      profileId: snapshot.docs[0]?.id,
      role,
      companyId,
      salonIds: userData?.salonIds || [],
      schoolEnabled,
      schoolName,
      isImpersonating,
      originalSystemOwnerUid
    };
  } catch (error: any) {
    console.error("Auth verification failed:", error);
    if (
      error.code === "auth/session-cookie-expired" ||
      error.code === "auth/session-cookie-revoked" ||
      error.message?.includes("expired") ||
      error.message?.includes("auth/")
    ) {
      redirect("/login");
    }
    throw new Error(`認証エラー: ${error.message || String(error)}`);
  }
}
