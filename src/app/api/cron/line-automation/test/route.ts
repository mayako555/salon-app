import { NextResponse } from "next/server";
import { sendLineMessage } from "@/lib/line";

export async function POST(request: Request) {
  try {
    const { lineUserId, message, storeName } = await request.json();

    if (!lineUserId || !message) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const res = await sendLineMessage(lineUserId, message, storeName);
    
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("Test send failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
