import { getIronSession } from "iron-session";
import { cookies, headers } from "next/headers";
import { sessionOptions, type SessionData } from "./session-core";

export * from "./session-core";

/** 요청이 HTTPS로 들어왔는지 (리버스 프록시의 x-forwarded-proto 포함). COOKIE_SECURE=1이면 항상 secure */
async function isSecureRequest() {
  if (process.env.COOKIE_SECURE === "1") return true;
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https";
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions({ secure: await isSecureRequest() }));
}
