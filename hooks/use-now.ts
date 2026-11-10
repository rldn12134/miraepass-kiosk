"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * intervalMs 단위로 갱신되는 현재 시각 (경과 시간·시계 표시용).
 * 서버 렌더링/하이드레이션 중에는 0을 돌려줘서 빌드 시점 시각과 어긋나는 하이드레이션 오류를 막는다.
 */
export function useNow(intervalMs = 15_000) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const t = setInterval(onChange, intervalMs);
      return () => clearInterval(t);
    },
    [intervalMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
