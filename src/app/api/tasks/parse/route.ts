import { NextResponse } from "next/server";
import { parseTasksFromText } from "@/lib/ai-task-parser";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentUserContext();
    if (!profile || !["systemOwner", "companyOwner", "admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: "テキストが入力されていません" }, { status: 400 });
    }

    const result = await parseTasksFromText(text);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json({ success: false, error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
