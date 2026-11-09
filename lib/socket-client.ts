"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let currentKey = "";

/** 역할별 싱글턴 소켓. 역할/토큰이 바뀌면 새로 연결 */
export function getSocket(auth: { role: "kiosk" | "staff"; kioskToken?: string | null }): AppSocket {
  const key = `${auth.role}:${auth.kioskToken ?? ""}`;
  if (socket && currentKey === key) return socket;
  socket?.disconnect();
  currentKey = key;
  socket = io({ path: "/socket.io", auth, transports: ["websocket", "polling"], reconnectionDelayMax: 5000 });
  return socket;
}
