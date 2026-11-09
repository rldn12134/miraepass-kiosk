import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getSession } from "./session";
import type { ApiErrorCode, SessionUser } from "./types";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ success: true, data }, init);

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message, ...error.extra },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, code: "VALIDATION", message: "요청 값이 올바르지 않아요", issues: error.issues },
      { status: 422 },
    );
  }
  console.error("[api] unhandled", error);
  return NextResponse.json({ success: false, code: "INTERNAL", message: "서버 오류가 발생했어요" }, { status: 500 });
}

type Ctx<P> = { params: Promise<P> };

/** try/catch + 에러 직렬화를 감싼 Route Handler */
export function handler<P = Record<string, string>>(fn: (req: Request, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json = await req.json().catch(() => {
    throw new ApiError("VALIDATION", "JSON 본문이 필요해요", 400);
  });
  return schema.parse(json);
}

export async function requireUser(role: SessionUser["role"] = "staff"): Promise<SessionUser> {
  const session = await getSession();
  const user = session.user;
  if (!user) throw new ApiError("UNAUTHORIZED", "로그인이 필요해요", 401);
  if (role === "admin" && user.role !== "admin") throw new ApiError("FORBIDDEN", "관리자 권한이 필요해요", 403);
  return user;
}

export function requireKiosk(req: Request) {
  const expected = process.env.KIOSK_DEVICE_TOKEN;
  const token = req.headers.get("x-kiosk-token");
  if (!expected || token !== expected) throw new ApiError("UNAUTHORIZED", "등록되지 않은 키오스크예요", 401);
  return token;
}

/** 아주 단순한 메모리 rate limit (키오스크 조회 남용 방지) */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++b.count > limit) throw new ApiError("RATE_LIMITED", "잠시 후 다시 시도해 주세요", 429);
}

export const idParam = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError("NOT_FOUND", "잘못된 ID예요", 404);
  return n;
};
