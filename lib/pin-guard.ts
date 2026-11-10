/**
 * 키오스크 결제 비밀번호 무차별 대입 방지.
 * 같은 MIRAEPASS ID로 WINDOW_MS 안에 MAX_FAILURES번 틀리면 LOCK_MS 동안 결제를 막는다.
 * 키오스크 서버 메모리에만 보관하므로 서버를 다시 시작하면 초기화된다.
 */
export const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60_000;
const LOCK_MS = 10 * 60_000;

type Entry = { failures: number[]; lockedUntil: number };

declare global {
  var __pinGuard: Map<number, Entry> | undefined;
}
const store = (globalThis.__pinGuard ??= new Map<number, Entry>());

function entry(id: number, now: number): Entry {
  const e = store.get(id) ?? { failures: [], lockedUntil: 0 };
  e.failures = e.failures.filter((t) => now - t < WINDOW_MS);
  store.set(id, e);
  return e;
}

/** 잠겨 있으면 남은 잠금 시간(ms), 아니면 0 */
export function lockedFor(id: number, now = Date.now()): number {
  const e = entry(id, now);
  return e.lockedUntil > now ? e.lockedUntil - now : 0;
}

/** 실패 기록 → 남은 시도 횟수 (0이면 방금 잠김) */
export function recordFailure(id: number, now = Date.now()): number {
  const e = entry(id, now);
  e.failures.push(now);
  const remaining = Math.max(0, MAX_FAILURES - e.failures.length);
  if (remaining === 0) {
    e.lockedUntil = now + LOCK_MS;
    e.failures = [];
  }
  return remaining;
}

export function recordSuccess(id: number) {
  store.delete(id);
}

/** 테스트용 */
export function resetPinGuard() {
  store.clear();
}
