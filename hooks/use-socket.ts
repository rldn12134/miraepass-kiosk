"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket, type AppSocket } from "@/lib/socket-client";
import type { ServerToClientEvents } from "@/lib/types";

type Handlers = Partial<{ [E in keyof ServerToClientEvents]: ServerToClientEvents[E] }>;

/**
 * 소켓 연결 + 이벤트 구독. 핸들러는 ref로 보관해서 재구독 없이 최신 클로저를 쓴다.
 * onReconnect: 재연결 시(놓친 이벤트 보정용) 호출
 */
export function useSocket(
  auth: { role: "kiosk" | "staff"; kioskToken?: string | null } | null,
  handlers: Handlers,
  onReconnect?: () => void,
) {
  const [connected, setConnected] = useState(false);
  const ref = useRef({ handlers, onReconnect });
  useEffect(() => {
    ref.current = { handlers, onReconnect };
  });

  const role = auth?.role;
  const token = auth?.kioskToken;

  useEffect(() => {
    if (!role) return;
    const socket: AppSocket = getSocket({ role, kioskToken: token });
    let wasConnected = socket.connected;
    // 이미 연결된 싱글턴 소켓을 재사용하는 경우 상태 동기화
    queueMicrotask(() => setConnected(socket.connected));

    const onConnect = () => {
      setConnected(true);
      if (wasConnected) ref.current.onReconnect?.();
      wasConnected = true;
    };
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const events = Object.keys(ref.current.handlers) as (keyof ServerToClientEvents)[];
    const bound = events.map((event) => {
      const fn = (...args: unknown[]) => (ref.current.handlers[event] as ((...a: unknown[]) => void) | undefined)?.(...args);
      socket.on(event, fn as never);
      return [event, fn] as const;
    });
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      bound.forEach(([event, fn]) => socket.off(event, fn as never));
    };
  }, [role, token]);

  return connected;
}
