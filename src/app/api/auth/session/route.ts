import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // セッションの有効期限 (例: 5日間)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Firebase Admin で Session Cookie を作成
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Cookieにセット (Next.js 15+ では await が必要)
    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn,
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
      return NextResponse.json({ success: true, uid: decodedClaims.uid });
    } catch (e: any) {
      return NextResponse.json({ 
        error: "verifySessionCookie failed", 
        message: e.message || String(e),
        code: e.code,
        sessionValue: session.substring(0, 20) + "..."
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Global error", message: error.message });
  }
}
