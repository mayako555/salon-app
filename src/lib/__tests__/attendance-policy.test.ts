import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldApplyJasmineShiftPolicy } from "@/lib/attendance-policy";

describe("shouldApplyJasmineShiftPolicy", () => {
  it("enables the legacy Jasmine Lash rule when the setting is absent", () => {
    assert.equal(shouldApplyJasmineShiftPolicy("company_default", undefined), true);
  });

  it("allows Jasmine Lash to explicitly disable the rule", () => {
    assert.equal(shouldApplyJasmineShiftPolicy("company_default", false), false);
  });

  it("never applies the Jasmine Lash rule to another tenant", () => {
    assert.equal(shouldApplyJasmineShiftPolicy("another-company", true), false);
    assert.equal(shouldApplyJasmineShiftPolicy("another-company", undefined), false);
  });
});
