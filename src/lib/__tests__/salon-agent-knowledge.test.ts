import assert from "node:assert/strict";
import test from "node:test";

import { getSalonAgentBuiltInAnswer } from "../salon-agent-knowledge";

test("SALON AGENTがLINE連携手順をAPIキーなしでも案内できる", () => {
  const answer = getSalonAgentBuiltInAnswer("加盟店のLINE連携はどうすればいい？");

  assert.ok(answer);
  assert.match(answer, /LINE公式アカウント/);
  assert.match(answer, /システム設定/);
  assert.match(answer, /LIFF ID/);
  assert.match(answer, /店舗ごと/);
});

test("LINE連携以外の質問は組み込み回答の対象にしない", () => {
  assert.equal(getSalonAgentBuiltInAnswer("給与明細はどこですか？"), null);
});
