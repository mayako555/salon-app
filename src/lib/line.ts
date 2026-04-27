"use server";

import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * 送信メッセージを生成する
 */
export async function sendLineMessage(lineUserId: string, message: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE message.");
    console.log(`[MOCK LINE TO ${lineUserId}]: ${message}`);
    return { success: false, error: "LINE設定が未完了です" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending LINE message:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 次回予約確定メッセージを送信する
 */
export async function sendBookingConfirmation(customerName: string, lineUserId: string, date: string, time: string) {
  const message = `${customerName}様、本日はご来店ありがとうございました！\n\n次回のご予約を以下の通り承りました。\n\n【日時】\n${date} ${time}\n\nご来店を心よりお待ちしております。`;
  return await sendLineMessage(lineUserId, message);
}

/**
 * リマインダーメッセージを送信する
 */
export async function sendBookingReminder(customerName: string, lineUserId: string, date: string, time: string) {
  const message = `${customerName}様、こんにちは！\n\nご予約の2日前となりましたのでご連絡いたしました。\n\n【日時】\n${date} ${time}\n\n当日のご来店をお待ちしております。変更がある場合はお早めにご連絡ください。`;
  return await sendLineMessage(lineUserId, message);
}
