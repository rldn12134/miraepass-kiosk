"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/** Jotai: 직원 기기별 설정 (localStorage에 저장 → 기기마다 다르게) */
export type StaffDevicePrefs = {
  announceNewOrder: boolean;
  announceCall: boolean;
  chime: boolean;
};

export const staffPrefsAtom = atomWithStorage<StaffDevicePrefs>(
  "mp-cafe:staff-prefs",
  { announceNewOrder: true, announceCall: true, chime: true },
  undefined,
  { getOnInit: true },
);

/** 브라우저 자동재생 정책: 사용자가 한 번 터치해야 소리를 낼 수 있다 */
export const soundUnlockedAtom = atom(false);

/** 새로 들어와서 아직 확인하지 않은 주문 id (카드 강조용) */
export const freshOrderIdsAtom = atom<Set<number>>(new Set<number>());
