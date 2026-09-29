import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUserContext } from "@/lib/auth-server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const identity = await adminAuth.verifyIdToken(idToken);

    // セッションの有効期限 (例: 5日間)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Firebase Admin で Session Cookie を作成
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Cookieにセット (Next.js 15+ では await が必要)
    const cookieStore = await cookies();
    const previousSession = cookieStore.get("session")?.value;
    let previousUid: string | undefined;
    if (previousSession) {
      try { previousUid = (await adminAuth.verifySessionCookie(previousSession, true)).uid; }
      catch { /* Expired or invalid sessions must not retain impersonation. */ }
    }
    if (previousUid !== identity.uid) cookieStore.delete("impersonated_company_id");
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    cookieStore.delete("impersonated_company_id");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return NextResponse.json({ error: "No session" });
    
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(session, true);
      const context = await getCurrentUserContext();
      return NextResponse.json({ success: true, uid: decodedClaims.uid, companyId: context.companyId || "" }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (e: any) {
      return NextResponse.json({ 
        error: "verifySessionCookie failed", 
        message: e.message || String(e),
        code: e.code,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Global error", message: error.message });
  }
}
