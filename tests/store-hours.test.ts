import { describe, expect, it } from "vitest";
import { businessDate, computeStoreStatus, findNextOpen } from "@/lib/store-hours";
import type { StoreHours } from "@/lib/types";

const wd = { open: "08:00", close: "17:00", closed: false };
const off = { ...wd, closed: true };
const hours: StoreHours = { "0": off, "1": wd, "2": wd, "3": wd, "4": wd, "5": wd, "6": off };
const open = { closed: false, message: "" };
// 2026-11-09는 월요일. KST = UTC+9
const kst = (iso: string) => new Date(`${iso}+09:00`);

describe("computeStoreStatus", () => {
  it("영업시간 안이면 open", () => {
    expect(computeStoreStatus(hours, open, kst("2026-11-09T12:00:00")).open).toBe(true);
  });
  it("오픈 전·마감 후는 hours로 닫힘", () => {
    const before = computeStoreStatus(hours, open, kst("2026-11-09T07:59:00"));
    expect(before).toMatchObject({ open: false, reason: "hours", nextOpenAt: "오늘 08:00" });
    const after = computeStoreStatus(hours, open, kst("2026-11-09T17:00:00"));
    expect(after).toMatchObject({ open: false, reason: "hours", nextOpenAt: "내일 08:00" });
  });
  it("휴무일은 holiday, 다음 영업일 안내", () => {
    const sat = computeStoreStatus(hours, open, kst("2026-11-14T12:00:00"));
    expect(sat).toMatchObject({ open: false, reason: "holiday", nextOpenAt: "월요일 08:00" });
  });
  it("수동 영업중지가 영업시간보다 우선한다", () => {
    const s = computeStoreStatus(hours, { closed: true, message: "재료 준비 중" }, kst("2026-11-09T12:00:00"));
    expect(s).toMatchObject({ open: false, reason: "manual", message: "재료 준비 중" });
  });
  it("서버 타임존과 무관하게 KST 날짜를 쓴다", () => {
    expect(businessDate(new Date("2026-11-09T15:30:00Z"))).toBe("2026-11-10");
  });
  it("모든 요일이 휴무면 다음 영업 없음", () => {
    const allOff = Object.fromEntries(Object.keys(hours).map((k) => [k, off])) as StoreHours;
    expect(findNextOpen(allOff, kst("2026-11-09T12:00:00"))).toBeNull();
  });
});
