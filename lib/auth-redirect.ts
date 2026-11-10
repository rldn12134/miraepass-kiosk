import type { SessionUser } from "./types";

/** 로그인 화면·보호 화면 사이의 이동 규칙 (proxy.ts와 로그인 폼이 함께 사용) */

export type Area = "staff" | "admin";

export const LOGIN_PATH: Record<Area, string> = { staff: "/staff/login", admin: "/admin/login" };
export const HOME_PATH: Record<Area, string> = { staff: "/staff", admin: "/admin" };

export const areaOf = (pathname: string): Area => (pathname.startsWith("/admin") ? "admin" : "staff");
export const isLoginPath = (pathname: string) => pathname === LOGIN_PATH.staff || pathname === LOGIN_PATH.admin;

/** 이 역할이 해당 영역에 들어갈 수 있는지. 관리자는 직원 화면도 쓸 수 있다 */
export const canAccess = (role: SessionUser["role"], area: Area) => area === "staff" || role === "admin";

/**
 * 로그인 후 돌아갈 경로 검증: 같은 사이트의 /staff·/admin 화면만 허용 (오픈 리다이렉트 방지).
 * 로그인 화면 자체나 형식이 이상한 값이면 null.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(next, "http://local");
  } catch {
    return null;
  }
  if (url.origin !== "http://local") return null;
  if (!/^\/(staff|admin)(\/|$)/.test(url.pathname) || isLoginPath(url.pathname)) return null;
  return url.pathname + url.search;
}

/** 로그인에 성공한 사용자가 이동할 곳 */
export function destinationAfterLogin(role: SessionUser["role"], area: Area, next: string | null | undefined): string {
  const target = safeNext(next);
  if (target && canAccess(role, areaOf(target))) return target;
  return canAccess(role, area) ? HOME_PATH[area] : HOME_PATH.staff;
}
