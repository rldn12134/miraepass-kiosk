import { getIronSession, unsealData, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export type SessionData = { user?: SessionUser };

export const SESSION_COOKIE = "mp_cafe_session";

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET 환경변수는 32자 이상이어야 해요");
  }
  return {
    cookieName: SESSION_COOKIE,
    password,
    ttl: 60 * 60 * 12,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

/** proxy.ts / socket.io 처럼 next/headers를 쓸 수 없는 곳에서 쿠키 값으로 세션 복원 */
export async function readSessionCookie(value: string | undefined): Promise<SessionData> {
  if (!value) return {};
  try {
    return await unsealData<SessionData>(value, { password: sessionOptions().password as string, ttl: 60 * 60 * 12 });
  } catch {
    return {};
  }
}

const idList = (v?: string) =>
  new Set(
    (v ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Boolean),
  );

/** 허용 목록으로 역할 결정. 관리자는 직원 화면도 쓸 수 있다 */
export function roleFor(userId: number): SessionUser["role"] | null {
  if (idList(process.env.ADMIN_USER_IDS).has(userId)) return "admin";
  if (idList(process.env.STAFF_USER_IDS).has(userId)) return "staff";
  return null;
}
