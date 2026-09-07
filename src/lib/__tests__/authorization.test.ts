import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDocumentTenant,
  isUnscopedSystemOwner,
  requireCompanyId,
  verifyPermission,
  withTenantCompanyId,
  type UserContext,
} from "@/lib/authorization";

function context(overrides: Partial<UserContext> = {}): UserContext {
  return {
    uid: "user-a",
    role: "manager",
    companyId: "tenant-a",
    salonIds: ["store-a"],
    ...overrides,
  };
}

describe("tenant authorization policy", () => {
  it("allows a tenant user to access a companyId document in their company", () => {
    assert.doesNotThrow(() => assertDocumentTenant(context(), { companyId: "tenant-a" }));
  });

  it("supports tenant_id while legacy documents are being migrated", () => {
    assert.doesNotThrow(() => assertDocumentTenant(context(), { tenant_id: "tenant-a" }));
  });

  it("blocks access to a document in another company", () => {
    assert.throws(
      () => assertDocumentTenant(context(), { companyId: "tenant-b" }),
      /Unauthorized tenant access/,
    );
  });

  it("blocks tenant access when the authenticated context has no company", () => {
    assert.throws(() => requireCompanyId(context({ companyId: undefined })), /Company ID is missing/);
  });

  it("allows an unscoped system owner to access documents across companies", () => {
    const owner = context({ role: "systemOwner", companyId: undefined });
    assert.equal(isUnscopedSystemOwner(owner), true);
    assert.doesNotThrow(() => assertDocumentTenant(owner, { companyId: "tenant-b" }));
  });

  it("restricts an impersonating system owner to the impersonated company", () => {
    const owner = context({ role: "systemOwner", companyId: "tenant-b", isImpersonating: true });
    assert.equal(isUnscopedSystemOwner(owner), false);
    assert.throws(() => assertDocumentTenant(owner, { companyId: "tenant-a" }), /Unauthorized tenant access/);
    assert.doesNotThrow(() => assertDocumentTenant(owner, { companyId: "tenant-b" }));
  });

  it("overrides a spoofed companyId on tenant writes", () => {
    assert.deepEqual(withTenantCompanyId(context(), { companyId: "tenant-b", value: 1 }), {
      companyId: "tenant-a",
      value: 1,
    });
  });

  it("does not invent a companyId for an unscoped system owner write", () => {
    const owner = context({ role: "systemOwner", companyId: undefined });
    assert.deepEqual(withTenantCompanyId(owner, { value: 1 }), { value: 1 });
  });
});

describe("role permission policy", () => {
  it("allows managers to operate within their company", () => {
    assert.equal(verifyPermission(context(), "tenant-a"), true);
  });

  it("blocks managers from targeting another company", () => {
    assert.throws(() => verifyPermission(context(), "tenant-b"), /権限がありません/);
  });

  it("allows staff to target their own user record", () => {
    assert.equal(verifyPermission(context({ role: "staff" }), "tenant-a", "user-a"), true);
  });

  it("blocks staff from targeting another user record", () => {
    assert.throws(
      () => verifyPermission(context({ role: "staff" }), "tenant-a", "user-b"),
      /権限がありません/,
    );
  });

  it("does not let impersonation bypass the target company check", () => {
    const owner = context({ role: "systemOwner", companyId: "tenant-b", isImpersonating: true });
    assert.throws(() => verifyPermission(owner, "tenant-a"), /権限がありません/);
  });
});
