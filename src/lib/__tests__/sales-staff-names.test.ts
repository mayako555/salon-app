import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deduplicateSalesStaffNames,
  normalizeSalesStaffName,
} from "../sales-staff-names";

describe("sales staff names", () => {
  it("normalizes spacing and legacy kanji variants", () => {
    assert.equal(normalizeSalesStaffName("山田　凜"), "山田凛");
    assert.equal(normalizeSalesStaffName("山田 凛"), "山田凛");
  });

  it("keeps only the first display name for duplicate staff profiles", () => {
    assert.deepEqual(
      deduplicateSalesStaffNames(["山田 凛", "山田　凜", "佐藤 花子", "山田凛"]),
      ["山田 凛", "佐藤 花子"],
    );
  });

  it("ignores empty staff names", () => {
    assert.deepEqual(deduplicateSalesStaffNames(["", null, undefined, "佐藤"]), ["佐藤"]);
  });
});
