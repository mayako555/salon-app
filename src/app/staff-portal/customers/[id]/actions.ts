"use server";

import { sendBookingConfirmation } from "@/lib/line";
import { getCurrentUserContext } from "@/lib/auth-server";

export async function testSendLineMessage(name: string, lineUserId: string, date: string, time: string, storeName: string = "メイン店舗") {
  try {
    const ctx = await getCurrentUserContext();
    const res = await sendBookingConfirmation(name, lineUserId, date, time, storeName, ctx.companyId);
    return res;
  } catch (error: any) {
    console.error("Test send error:", error);
    return { success: false, error: error.message };
  }
}
