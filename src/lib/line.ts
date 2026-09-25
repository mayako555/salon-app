"use server";

import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";
import { requireFeature } from "./feature-utils";
import { sendLineMessage } from "./line-delivery";

/**
 * データベースへ送信履歴を記録しつつLINEメッセージを送信する
 */
export async function sendAndLogLineMessage({
  customerId,
  accountingId,
  lineUserId,
  messageType,
  messageBody,
  storeName,
  companyId
}: {
  customerId: string;
  accountingId: string;
  lineUserId: string;
  messageType: string;
  messageBody: string;
  storeName?: string;
  companyId?: string;
}) {
  const ctx = await getCurrentUserContext();
  const effectiveCompanyId = ctx.companyId;
  if (!effectiveCompanyId) return { success: false, error: "会社IDが取得できません" };
  if (companyId && companyId !== effectiveCompanyId) {
    return { success: false, error: "他社のLINE設定は使用できません" };
  }
  await requireFeature(effectiveCompanyId, "line_automation");
  const sendResult = await sendLineMessage(lineUserId, messageBody, storeName, effectiveCompanyId);
  
  try {
    await adminDb.collection("line_message_logs").add({
      companyId: effectiveCompanyId,
      customer_id: customerId,
      accounting_id: accountingId || "", 
      line_user_id: lineUserId,
      message_type: messageType,
      message_body: messageBody,
      storeName: storeName || "不明",
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
export async function sendBookingConfirmation(customerName: string, lineUserId: string, date: string, time: string, storeName: string = "メイン店舗", companyId?: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) return { success: false, error: "会社IDが取得できません" };
  if (companyId && companyId !== ctx.companyId) {
    return { success: false, error: "他社のLINE設定は使用できません" };
  }
  await requireFeature(ctx.companyId, "line_automation");
  const message = await generateBookingConfirmationText(date, time, storeName);
  return await sendLineMessage(lineUserId, message, storeName, ctx.companyId);
}

/**
 * リマインダーメッセージを送信する
 */
export async function sendBookingReminder(customerName: string, lineUserId: string, date: string, time: string, storeName: string = "メイン店舗") {
  const ctx = await getCurrentUserContext();
  if (!ctx.companyId) return { success: false, error: "会社IDが取得できません" };
  await requireFeature(ctx.companyId, "line_automation");
  const dateObj = new Date(date);
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const formattedDate = `${dateObj.getMonth() + 1}／${dateObj.getDate()}（${dayOfWeek}）`;

  const message = `こんにちは🕊
明後日のご予約のリマインドです。

【 次回予約日時 】

${formattedDate} ${time}〜

🌿 当サロン ${storeName} 🕊

日時のご確認をお願いいたします。
当日お気をつけてお越しくださいませ🤍`;

  return await sendLineMessage(lineUserId, message, storeName, ctx.companyId);
}
