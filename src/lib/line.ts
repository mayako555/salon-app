"use server";

import { db } from "./firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";

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
 * データベースへ送信履歴を記録しつつLINEメッセージを送信する
 */
export async function sendAndLogLineMessage({
  customerId,
  accountingId,
  lineUserId,
  messageType,
  messageBody
}: {
  customerId: string;
  accountingId: string;
  lineUserId: string;
  messageType: string;
  messageBody: string;
}) {
  const sendResult = await sendLineMessage(lineUserId, messageBody);
  
  try {
    await addDoc(collection(db, "line_message_logs"), {
      customer_id: customerId,
      accounting_id: accountingId || "", 
      line_user_id: lineUserId,
      message_type: messageType,
      message_body: messageBody,
      sent_at: new Date().toISOString(),
      status: sendResult.success ? "success" : "failed",
      error_message: sendResult.error || null
    });
  } catch (logError) {
    console.error("Failed to log LINE message:", logError);
  }
  
  return sendResult;
}

/**
 * 次回予約確定メッセージを生成する（送信はしない）
 */
export async function generateBookingConfirmationText(date: string, time: string, storeName: string) {
  const dateObj = new Date(date);
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

  return `ご来店ありがとうございました🤍
━━━━━━━━━━━━━━━
【 次回予約日時 】

${formattedDate}（${dayOfWeek}）${time}〜

${storeName}店
━━━━━━━━━━━━━━━
日時のご確認をお願いいたします。
ご変更がある場合はお気軽にお問い合わせください。

《 次回ご予約の注意事項 》

●当日の予約変更・キャンセルはキャンセル料が発生します。必ず前日までにご連絡ください。
※前日の変更・キャンセルをする場合、前日であっても１８時を過ぎてからのご連絡は当日変更・キャンセルに該当しますのでご注意ください。

┈┈┈┈┈┈┈┈┈┈`;
}

/**
 * 次回予約確定メッセージを送信する（レガシー互換用・ログ保存なし）
 */
export async function sendBookingConfirmation(customerName: string, lineUserId: string, date: string, time: string) {
  const message = generateBookingConfirmationText(date, time, "六甲道"); // デフォルト
  return await sendLineMessage(lineUserId, message);
}

/**
 * リマインダーメッセージを送信する
 */
export async function sendBookingReminder(customerName: string, lineUserId: string, date: string, time: string) {
  const dateObj = new Date(date);
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}／${dateObj.getDate()}（${dayOfWeek}）`;

  const message = `こんにちは🕊
明後日のご予約のリマインドです。

【 次回予約日時 】

${formattedDate} ${time}〜

🌿 Jasmine Lash 六甲道店 🕊

日時のご確認をお願いいたします。
当日お気をつけてお越しくださいませ🤍`;

  return await sendLineMessage(lineUserId, message);
}
