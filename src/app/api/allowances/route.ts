import { NextResponse } from "next/server";
import { getMonthlyAllowanceTasks } from "@/app/allowances/actions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString(), 10);
  const month = parseInt(url.searchParams.get("month") || (new Date().getMonth() + 1).toString(), 10);

  try {
    const data = await getMonthlyAllowanceTasks(year, month);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Allowances API] Failed:", error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
