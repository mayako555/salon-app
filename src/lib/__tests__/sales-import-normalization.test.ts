import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSalesDate,
  parseSalesAmount,
  parseTreatmentDuration,
} from "../sales-import-normalization";

describe("sales import normalization", () => {
  it("parses supported treatment duration formats", () => {
    assert.equal(parseTreatmentDuration("90分"), 90);
    assert.equal(parseTreatmentDuration("1.5h"), 90);
    assert.equal(parseTreatmentDuration("1時間30分"), 90);
    assert.equal(parseTreatmentDuration("120"), 120);
  });

  it("uses 60 minutes when treatment duration is missing or invalid", () => {
    assert.equal(parseTreatmentDuration(undefined), 60);
    assert.equal(parseTreatmentDuration("不明"), 60);
  });

  it("normalizes supported sales date formats", () => {
    assert.equal(normalizeSalesDate("2026/9/7"), "2026-09-07");
    assert.equal(normalizeSalesDate("2026-9-7"), "2026-09-07");
    assert.equal(normalizeSalesDate("20260907"), "2026-09-07");
  });

  it("preserves unknown date formats", () => {
    assert.equal(normalizeSalesDate("9月7日"), "9月7日");
  });

  it("parses formatted, negative and empty sales amounts", () => {
    assert.equal(parseSalesAmount("¥12,340"), 12_340);
    assert.equal(parseSalesAmount("-3,000円"), -3_000);
    assert.equal(parseSalesAmount(undefined), 0);
    assert.equal(parseSalesAmount(""), 0);
  });
});
