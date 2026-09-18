import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStaffRoleChange } from "../staff-role-guard";

describe("validateStaffRoleChange", () => {
  it("rejects downgrading a system owner", () => {
    assert.throws(
      () => validateStaffRoleChange("systemOwner", "staff"),
      /システムオーナーの権限はスタッフ管理画面から変更できません/,
    );
  });

  it("allows editing a system owner without changing the role", () => {
    assert.doesNotThrow(() => validateStaffRoleChange("systemOwner", "systemOwner"));
  });

  it("allows normal staff role changes", () => {
    assert.doesNotThrow(() => validateStaffRoleChange("staff", "manager"));
  });
});
