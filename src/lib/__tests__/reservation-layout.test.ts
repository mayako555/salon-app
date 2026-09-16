import assert from "node:assert/strict";
import test from "node:test";
import { calculateReservationLanes } from "../reservation-layout";

const reservation = (id: string, start_time: string, end_time: string) => ({
  id,
  start_time,
  end_time,
});

test("重ならない予約はそれぞれ1レーンで表示する", () => {
  const result = calculateReservationLanes([
    reservation("a", "09:00", "10:00"),
    reservation("b", "11:00", "12:00"),
  ]);

  assert.deepEqual(result.get("a"), { laneIndex: 0, laneCount: 1 });
  assert.deepEqual(result.get("b"), { laneIndex: 0, laneCount: 1 });
});

test("同じ時間帯の予約は別レーンへ割り当てる", () => {
  const result = calculateReservationLanes([
    reservation("a", "09:00", "10:00"),
    reservation("b", "09:00", "10:00"),
  ]);

  assert.deepEqual(result.get("a"), { laneIndex: 0, laneCount: 2 });
  assert.deepEqual(result.get("b"), { laneIndex: 1, laneCount: 2 });
});

test("一部だけ重なる連続予約も必要最小限のレーンへ割り当てる", () => {
  const result = calculateReservationLanes([
    reservation("a", "09:00", "10:00"),
    reservation("b", "09:30", "10:30"),
    reservation("c", "10:00", "11:00"),
  ]);

  assert.deepEqual(result.get("a"), { laneIndex: 0, laneCount: 2 });
  assert.deepEqual(result.get("b"), { laneIndex: 1, laneCount: 2 });
  assert.deepEqual(result.get("c"), { laneIndex: 0, laneCount: 2 });
});

test("終了時刻と開始時刻が同じ予約は重複扱いにしない", () => {
  const result = calculateReservationLanes([
    reservation("a", "09:00", "10:00"),
    reservation("b", "10:00", "11:00"),
  ]);

  assert.deepEqual(result.get("a"), { laneIndex: 0, laneCount: 1 });
  assert.deepEqual(result.get("b"), { laneIndex: 0, laneCount: 1 });
});

test("不正な時間は安全に1レーンへフォールバックする", () => {
  const result = calculateReservationLanes([
    reservation("a", "invalid", "10:00"),
    reservation("b", "11:00", "10:00"),
  ]);

  assert.deepEqual(result.get("a"), { laneIndex: 0, laneCount: 1 });
  assert.deepEqual(result.get("b"), { laneIndex: 0, laneCount: 1 });
});
