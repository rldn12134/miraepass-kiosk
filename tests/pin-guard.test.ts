import { beforeEach, describe, expect, it } from "vitest";
import { lockedFor, MAX_FAILURES, recordFailure, recordSuccess, resetPinGuard } from "@/lib/pin-guard";

const MIN = 60_000;

describe("pin-guard", () => {
  beforeEach(() => resetPinGuard());

  it("남은 시도 횟수를 줄이고 마지막 실패에서 잠근다", () => {
    const t = 1_000_000;
    for (let i = 1; i < MAX_FAILURES; i++) expect(recordFailure(3412, t + i)).toBe(MAX_FAILURES - i);
    expect(lockedFor(3412, t + 10)).toBe(0);
    expect(recordFailure(3412, t + 20)).toBe(0);
    expect(lockedFor(3412, t + 21)).toBeGreaterThan(9 * MIN);
    expect(lockedFor(3412, t + 20 + 10 * MIN)).toBe(0);
  });

  it("10분이 지난 실패는 세지 않는다", () => {
    const t = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure(2307, t);
    expect(recordFailure(2307, t + 11 * MIN)).toBe(MAX_FAILURES - 1);
  });

  it("성공하면 실패 기록을 지우고, 사용자별로 따로 센다", () => {
    recordFailure(1101);
    recordFailure(1101);
    recordSuccess(1101);
    expect(recordFailure(1101)).toBe(MAX_FAILURES - 1);
    expect(recordFailure(4001)).toBe(MAX_FAILURES - 1);
  });
});
