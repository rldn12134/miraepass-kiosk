/** next/headers에 의존하지 않는 세션 유틸 (server.ts, proxy.ts에서도 사용) */
import { unsealData, type SessionOptions } from "iron-session";
import type { SessionUser } from "./types";

export type SessionData = { user?: SessionUser };

export const SESSION_COOKIE = "mp_cafe_session";

/**
 * secure 쿠키는 HTTPS로 접속했을 때만 붙인다.
 * 태블릿이 http://192.168.x.x 로 접속하는 교내 환경에서 Secure 쿠키는 저장되지 않아
 * 로그인해도 계속 로그인 화면으로 돌아오는 문제가 있었다.
 */
export function sessionOptions(opts: { secure?: boolean } = {}): SessionOptions {
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
      secure: opts.secure ?? false,
      path: "/",
    },
  };
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
