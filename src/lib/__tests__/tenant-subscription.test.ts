import assert from "node:assert/strict";
import test from "node:test";

import {
    addCalendarMonths,
    createTrialSubscriptionDefaults,
    getSubscriptionStatusLabel,
    normalizeMonthlyFee,
    normalizeSubscriptionStatus,
} from "../tenant-subscription";

test("既存テナントの未設定契約状態は契約中として扱う", () => {
    assert.equal(normalizeSubscriptionStatus(undefined), "active");
});

test("3か月無料期間は月末を越えない", () => {
    assert.equal(addCalendarMonths("2026-01-31", 3), "2026-04-30");
});

test("新規テナントは月額4,980円・3か月無料で初期化する", () => {
    assert.deepEqual(createTrialSubscriptionDefaults("2026-09-26"), {
        subscriptionStatus: "trial",
        fee: 4_980,
        startDate: "2026-09-26",
        trialEndDate: "2026-12-26",
    });
});

test("明示的な無料契約の0円を維持する", () => {
    assert.equal(normalizeMonthlyFee(0), 0);
});

test("契約状態の表示名を返す", () => {
    assert.equal(getSubscriptionStatusLabel("past_due"), "支払確認待ち");
});
