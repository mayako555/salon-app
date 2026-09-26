import "server-only";

import { getLineConfig } from "./lineConfig";

const FALLBACK_LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * LINE Messaging API へ実際に配信するサーバー専用処理。
 *
 * 認証・権限・契約機能の判定は、この関数を呼び出す各サーバー処理で
 * 必ず済ませる。クライアントから直接呼べる Server Action にはしない。
 */
export async function sendLineMessage(
  lineUserId: string,
  message: string,
  storeName?: string,
  companyId?: string,
) {
  let token: string | undefined;

  if (storeName && companyId) {
    const config = await getLineConfig(storeName, companyId);
    if (config?.channelAccessToken) token = config.channelAccessToken;
  }

  // 既存の単一テナント処理との互換用。テナント指定時は、他社の共通
  // トークンへフォールバックさせない。
  if (!companyId) token = FALLBACK_LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set for store: ", storeName, ". Skipping LINE message.");
    console.log(`[MOCK LINE TO ${lineUserId}]: ${message}`);
    return { success: false, error: "LINE設定が未完了です" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error sending LINE message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "LINEメッセージの送信に失敗しました",
    };
  }
}
