import assert from "node:assert/strict";
import test from "node:test";

import {
  isLineStoreSettingsComplete,
  normalizeLineStoreSettings,
} from "../line-integration-settings";

test("LINE店舗設定の空白を除去して正規化する", () => {
  assert.deepEqual(
    normalizeLineStoreSettings({
      channelAccessToken: " token ",
      lineOaId: " @salon ",
      liffId: " 123-abcd ",
    }),
    {
      channelAccessToken: "token",
      lineOaId: "@salon",
      liffId: "123-abcd",
    },
  );
});

test("3項目が揃った店舗だけLINE連携設定済みと判定する", () => {
  assert.equal(
    isLineStoreSettingsComplete({
      channelAccessToken: "token",
      lineOaId: "@salon",
      liffId: "123-abcd",
    }),
    true,
  );
  assert.equal(
    isLineStoreSettingsComplete({
      channelAccessToken: "token",
      lineOaId: "@salon",
      liffId: "",
    }),
    false,
  );
});
