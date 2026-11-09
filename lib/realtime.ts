import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;
export type Room = "kiosk" | "staff" | "admin";

declare global {
  var __io: IO | undefined;
}

export function setIO(io: IO) {
  globalThis.__io = io;
}

/** Route Handler에서 호출. 커스텀 서버(server.ts)가 아닌 환경(next build 등)에서는 조용히 무시 */
export function emit<E extends keyof ServerToClientEvents>(
  rooms: Room | Room[],
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  const io = globalThis.__io;
  if (!io) return;
  io.to(rooms).emit(event, ...args);
}
