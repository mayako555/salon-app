import assert from "node:assert/strict";
import test from "node:test";

import { requireFirebaseEnv } from "../firebase-config";

test("requireFirebaseEnv returns a configured value", () => {
  assert.equal(requireFirebaseEnv("TEST_FIREBASE_VALUE", "configured"), "configured");
});

test("requireFirebaseEnv rejects missing or blank values", () => {
  for (const value of [undefined, "", "   "]) {
    assert.throws(
      () => requireFirebaseEnv("TEST_FIREBASE_VALUE", value),
      /Missing required Firebase environment variable: TEST_FIREBASE_VALUE/,
    );
  }
});
