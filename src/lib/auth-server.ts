import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";

export type UserRole = "systemOwner" | "companyOwner" | "manager" | "storeManager" | "staff" | "admin";

export interface UserContext {
  uid: string;
  role: UserRole;
  companyId: string;
  salonIds: string[];
}

/**
 * すべてのサーバーアクションの先頭で呼び出し、現在のユーザーコンテキストを取得する
 */
export async function getCurrentUserContext(): Promise<UserContext> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    throw new Error("セッションが見つかりません (Missing Session Cookie)");
  }

  try {
    // セッショントークンを検証
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);
    const uid = decodedClaims.uid;
    const email = decodedClaims.email;

    // users/{uid} ではなく、現状の仕様に合わせて staff_profiles を email で検索
    let snapshot;
    if (email) {
      snapshot = await adminDb.collection("staff_profiles").where("email", "==", email).limit(1).get();
    } else {
      snapshot = await adminDb.collection("staff_profiles").where("uid", "==", uid).limit(1).get();
    }
    
    if (!snapshot || snapshot.empty) {
      // Create a default systemOwner context if they have an Auth account but no staff profile
      return {
        uid,
        role: "systemOwner",
        companyId: "company_default",
        salonIds: [],
      };
    }

    const userData = snapshot.docs[0]?.data();
    if (!userData) {
      throw new Error("ユーザーデータが空です (Empty User Data)");
    }
    
    return {
      uid,
      role: (userData?.role as UserRole) || "staff",
      companyId: userData?.companyId || "company_default", // 後方互換のためデフォルト値を設定
      salonIds: userData?.salonIds || [],
    };
  } catch (error: any) {
    console.error("Auth verification failed:", error);
    throw new Error(`認証エラー: ${error.message || String(error)}`);
  }
}

/**
 * 権限チェックユーティリティ
 * 各アクションで companyId 等のアクセス制御を共通化
 */
export function verifyPermission(
  ctx: UserContext,
  targetCompanyId?: string,
  targetUserId?: string
) {
  // 1. systemOwner は全て許可
  if (ctx.role === "systemOwner") return true;

  // 2. targetCompanyId が指定されている場合、自社かどうかチェック
  if (targetCompanyId && targetCompanyId !== ctx.companyId) {
    throw new Error("権限がありません");
  }

  // 3. staff権限の場合は自分のデータしか見られない (要求があれば)
  if (ctx.role === "staff" && targetUserId && targetUserId !== ctx.uid) {
    throw new Error("権限がありません");
  }

  return true;
}
