import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterStaffByCompany } from "@/lib/staff-filtering";

describe("filterStaffByCompany", () => {
  it("keeps only staff belonging to the selected company", () => {
    const staff = [
      { id: "same-company", companyId: "company-1" },
      { id: "other-company", companyId: "company-2" },
      { id: "legacy-without-company" },
    ];

    assert.deepEqual(filterStaffByCompany(staff, "company-1"), [staff[0]]);
  });

  it("does not return staff when the company has no matching profiles", () => {
    assert.deepEqual(filterStaffByCompany([
      { id: "other-company", companyId: "company-2" },
    ], "company-1"), []);
  });
});
