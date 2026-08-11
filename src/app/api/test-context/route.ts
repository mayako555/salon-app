import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentUserContext();
    return NextResponse.json({ success: true, context: ctx });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
