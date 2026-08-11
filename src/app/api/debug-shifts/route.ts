import { NextResponse } from "next/server";
import { getMonthlyShifts } from "@/app/shifts/actions";

export async function GET() {
  const shifts = await getMonthlyShifts(2026, 8);
  return NextResponse.json({ count: shifts.length, shifts });
}
