import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie, SESSION_COOKIE } from "@/lib/session-core";

/** 낙관적 페이지 보호: 실제 권한 검사는 각 API(requireUser)에서 다시 한다 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const loginPath = isAdmin ? "/admin/login" : "/staff/login";
  if (pathname === loginPath) return NextResponse.next();

  const { user } = await readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user || (isAdmin && user.role !== "admin")) {
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.search = user ? "?denied=1" : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
