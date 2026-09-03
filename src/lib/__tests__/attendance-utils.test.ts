import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAttendanceTimes } from "@/lib/attendance-utils";

describe("resolveAttendanceTimes", () => {
  it("uses raw clock times when no corrected values exist", () => {
    const result = resolveAttendanceTimes({
      clock_in: "2026-09-03T00:00:00.000Z",
      clock_out: "2026-09-03T09:00:00.000Z",
    });

    assert.equal(result.startTime?.toISOString(), "2026-09-03T00:00:00.000Z");
    assert.equal(result.endTime?.toISOString(), "2026-09-03T09:00:00.000Z");
    assert.equal(result.source, "raw");
  });

  it("prefers corrected clock times over raw values", () => {
    const result = resolveAttendanceTimes({
      clock_in: "2026-09-03T00:00:00.000Z",
      clock_out: "2026-09-03T09:00:00.000Z",
      effective_clock_in: "2026-09-03T00:30:00.000Z",
      effective_clock_out: "2026-09-03T08:30:00.000Z",
    });

    assert.equal(result.startTime?.toISOString(), "2026-09-03T00:30:00.000Z");
    assert.equal(result.endTime?.toISOString(), "2026-09-03T08:30:00.000Z");
    assert.equal(result.source, "effective");
  });

  it("returns null times for an incomplete empty attendance record", () => {
    assert.deepEqual(resolveAttendanceTimes({}), {
      startTime: null,
      endTime: null,
      source: "raw",
    });
  });
});
