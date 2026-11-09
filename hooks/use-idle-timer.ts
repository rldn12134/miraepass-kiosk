"use client";

import { useEffect, useRef } from "react";

/** 터치/키 입력이 seconds 동안 없으면 onIdle 호출. enabled=false면 멈춤 */
export function useIdleTimer(seconds: number, onIdle: () => void, enabled = true) {
  const cb = useRef(onIdle);
  useEffect(() => {
    cb.current = onIdle;
  });

  useEffect(() => {
    if (!enabled || seconds <= 0) return;
    let timer = setTimeout(() => cb.current(), seconds * 1000);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), seconds * 1000);
    };
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [seconds, enabled]);
}
