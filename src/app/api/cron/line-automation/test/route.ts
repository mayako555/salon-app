import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth-server";
import { sendLineMessage } from "@/lib/line";

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId || !["systemOwner", "companyOwner", "admin"].includes(ctx.role)) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const { lineUserId, message, storeName } = await request.json();
    if (typeof lineUserId !== "string" || !/^U[0-9a-f]{32}$/i.test(lineUserId)) {
      return NextResponse.json({ success: false, error: "LINEユーザーIDの形式が正しくありません" }, { status: 400 });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 5000) {
      return NextResponse.json({ success: false, error: "メッセージ本文が正しくありません" }, { status: 400 });
    }
    if (typeof storeName !== "string" || !storeName.trim()) {
      return NextResponse.json({ success: false, error: "店舗名が指定されていません" }, { status: 400 });
    }

    const result = await sendLineMessage(lineUserId, message, storeName, ctx.companyId);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ success: false, error: "ログインが必要です" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error?.message || "テスト送信に失敗しました" }, { status: 500 });
  }
}
