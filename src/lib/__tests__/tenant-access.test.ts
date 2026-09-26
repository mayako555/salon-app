import test from "node:test";
import assert from "node:assert/strict";

import {
  getFeatureForPathname,
  isTenantActive,
  normalizeTenantStatus,
} from "../tenant-access";

test("tenant status remains backward compatible when status is missing", () => {
  assert.equal(normalizeTenantStatus(undefined), "active");
  assert.equal(isTenantActive(undefined), true);
  assert.equal(isTenantActive("inactive"), false);
});

test("feature routes resolve for exact and nested paths", () => {
  assert.equal(getFeatureForPathname("/sales"), "sales");
  assert.equal(getFeatureForPathname("/sales/monthly?month=2026-09"), "sales");
  assert.equal(getFeatureForPathname("/allowances"), "payroll");
  assert.equal(getFeatureForPathname("/staff-portal/holidays"), "shifts");
  assert.equal(getFeatureForPathname("/staff-portal/transportation/new"), "payroll");
});

test("unrelated paths do not inherit similarly named feature routes", () => {
  assert.equal(getFeatureForPathname("/salesforce"), undefined);
  assert.equal(getFeatureForPathname("/admin/settings"), undefined);
});
