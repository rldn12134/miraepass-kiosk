"use client";

import { useEffect, useState } from "react";

/** intervalMs마다 갱신되는 현재 시각 (경과 시간·시계 표시용) */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
