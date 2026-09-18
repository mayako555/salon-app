import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStaffProfileCandidate } from "@/lib/staff-profile-resolution";

describe("resolveStaffProfileCandidate", () => {
  it("prefers the profile linked to the authenticated UID", () => {
    const candidates = [
      { id: "legacy" },
      { id: "current", uid: "auth-uid" },
    ];

    assert.equal(resolveStaffProfileCandidate(candidates, "auth-uid"), candidates[1]);
  });

  it("uses one unbound legacy profile when no UID match exists", () => {
    const legacy = { id: "legacy" };
    assert.equal(resolveStaffProfileCandidate([legacy], "auth-uid"), legacy);
  });

  it("never uses a profile linked to another UID", () => {
    assert.equal(
      resolveStaffProfileCandidate([{ id: "other", uid: "other-uid" }], "auth-uid"),
      null,
    );
  });

  it("rejects ambiguous duplicate UID profiles", () => {
    assert.throws(
      () => resolveStaffProfileCandidate([
        { id: "first", uid: "auth-uid" },
        { id: "second", uid: "auth-uid" },
      ], "auth-uid"),
      /Multiple staff profiles/,
    );
  });

  it("rejects ambiguous legacy profiles", () => {
    assert.throws(
      () => resolveStaffProfileCandidate([{ id: "first" }, { id: "second" }], "auth-uid"),
      /Multiple legacy staff profiles/,
    );
  });
});
