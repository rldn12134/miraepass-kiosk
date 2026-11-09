import "dotenv/config";
import fs from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import next from "next";
import { Server } from "socket.io";
import { seedIfEmpty } from "./lib/db/seed";
import { setIO, type IO } from "./lib/realtime";
import { readSessionCookie, SESSION_COOKIE } from "./lib/session";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";


function readCookie(header: string | undefined, name: string) {
  return header
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "data/uploads");
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** 관리자가 올린 메뉴 이미지는 빌드 이후에 생기므로 Next public 대신 직접 서빙 */
function serveUpload(req: IncomingMessage, res: ServerResponse) {
  const name = path.basename(decodeURIComponent((req.url ?? "").split("?")[0].slice("/uploads/".length)));
  const file = path.join(UPLOAD_DIR, name);
  const type = MIME[path.extname(name).toLowerCase()];
  if (!type || !fs.existsSync(file)) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(file).pipe(res);
}

let handle: ReturnType<ReturnType<typeof next>["getRequestHandler"]>;
const httpServer = createServer((req, res) => {
  if (req.url?.startsWith("/uploads/")) return serveUpload(req, res);
  return handle(req, res);
});
// httpServer를 넘겨야 Next dev 서버가 HMR WebSocket 업그레이드를 직접 처리한다
const app = next({ dev, hostname, port, httpServer });

app.prepare().then(() => {
  handle = app.getRequestHandler();
  if (seedIfEmpty()) console.log("> 샘플 메뉴를 생성했어요");

  // destroyUpgrade:false → socket.io 외 경로(HMR 등)의 업그레이드 요청을 끊지 않음
  const io: IO = new Server(httpServer, { path: "/socket.io", serveClient: false, destroyUpgrade: false });
  setIO(io);

  io.on("connection", async (socket) => {
    const { role, kioskToken } = (socket.handshake.auth ?? {}) as { role?: string; kioskToken?: string };

    if (role === "kiosk") {
      if (kioskToken && kioskToken === process.env.KIOSK_DEVICE_TOKEN) socket.join("kiosk");
      else return void socket.disconnect(true);
      return;
    }

    const session = await readSessionCookie(
      readCookie(socket.handshake.headers.cookie, SESSION_COOKIE) &&
        decodeURIComponent(readCookie(socket.handshake.headers.cookie, SESSION_COOKIE)!),
    );
    if (!session.user) return void socket.disconnect(true);
    socket.join("staff");
    if (session.user.role === "admin") socket.join("admin");
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> MIRAEPASS Cafe ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
    if (process.env.MIRAEPASS_MOCK === "1") console.log("> MIRAEPASS 모의(mock) 모드로 동작합니다");
  });
});
