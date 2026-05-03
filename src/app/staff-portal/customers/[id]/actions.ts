"use server";

import { sendBookingConfirmation } from "@/lib/line";

export async function testSendLineMessage(name: string, lineUserId: string, date: string, time: string) {
  try {
    const res = await sendBookingConfirmation(name, lineUserId, date, time);
    return res;
  } catch (error: any) {
    console.error("Test send error:", error);
    return { success: false, error: error.message };
  }
}
