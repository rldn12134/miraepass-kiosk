import { NextResponse, type NextRequest } from "next/server";
import { areaOf, canAccess, destinationAfterLogin, isLoginPath, LOGIN_PATH } from "@/lib/auth-redirect";
import { readSessionCookie, SESSION_COOKIE } from "@/lib/session-core";

/**
 * 낙관적 페이지 보호 (실제 권한 검사는 각 API의 requireUser에서 다시 한다)
 * - 로그인 안 됨 → 로그인 화면으로, 가려던 주소는 ?next= 로 보존
 * - 이미 로그인됨 + 로그인 화면 → 가려던 화면(또는 기본 화면)으로
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const area = areaOf(pathname);
  const { user } = await readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);

  if (isLoginPath(pathname)) {
    // 직원 계정으로 관리자 로그인 화면에 온 경우만 계정 전환을 위해 머문다
    if (user && canAccess(user.role, area)) {
      return redirectTo(req, destinationAfterLogin(user.role, area, req.nextUrl.searchParams.get("next")));
    }
    return NextResponse.next();
  }

  if (!user || !canAccess(user.role, area)) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH[area];
    url.search = "";
    url.searchParams.set("next", pathname + search);
    if (user) url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

function redirectTo(req: NextRequest, path: string) {
  const url = req.nextUrl.clone();
  const [p, q = ""] = path.split("?");
  url.pathname = p;
  url.search = q ? `?${q}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
