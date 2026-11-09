import { MiraepassApi, PointHistoryType, UserType, type User } from "@miraepass/api-client";
import { createClient } from "@miraepass/api-client/client";
import type { CustomerType } from "../types";
import { MiraepassError, type MiraepassGateway, type MPUser } from "./types";

type SdkResult = { data?: unknown; error?: unknown; response?: Response };

function baseUrl() {
  const url = process.env.MIRAEPASS_API_URL;
  if (!url) throw new MiraepassError("UNAVAILABLE", "MIRAEPASS_API_URL이 설정되지 않았어요");
  return url.endsWith("/") ? url : `${url}/`;
}

/** 요청마다 Cookie 헤더를 주입한 SDK 인스턴스 생성 (서버 전용) */
function sdk(cookie?: string) {
  const client = createClient({
    baseUrl: baseUrl(),
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  return new MiraepassApi({ client, key: `kiosk-${Math.random()}` });
}

function extractSessionCookie(res?: Response): string | null {
  if (!res) return null;
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") ?? ""];
  for (const raw of list) {
    const pair = raw.split(";")[0]?.trim();
    if (pair?.startsWith("session_id=")) return pair;
  }
  return null;
}

function messageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "MIRAEPASS 요청에 실패했어요";
}

/** SDK 결과를 검사해서 실패면 MiraepassError로 변환 */
function unwrap<T>(result: SdkResult, map: Partial<Record<number, MiraepassError["code"]>> = {}): T {
  if (!result.error && result.data !== undefined) {
    const body = result.data as { data?: T };
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }
  if (!result.error && result.response?.ok) return undefined as T;
  const status = result.response?.status;
  const code: MiraepassError["code"] =
    (status ? map[status] : undefined) ??
    (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "USER_NOT_FOUND" : status === 429 ? "LIMIT_EXCEEDED" : "UNAVAILABLE");
  throw new MiraepassError(code, messageOf(result.error), status);
}

async function call(fn: () => Promise<SdkResult>): Promise<SdkResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof MiraepassError) throw e;
    throw new MiraepassError("UNAVAILABLE", `MIRAEPASS 서버에 연결할 수 없어요 (${(e as Error).message})`);
  }
}

const toMPUser = (u: User): MPUser => ({
  id: u.id ?? 0,
  type: u.type,
  name: u.name,
  grade: u.grade,
  classNo: u.number,
  point: typeof u.point === "number" ? u.point : null,
});

/** 서비스 계정 세션: 메모리 캐시 + 동시 로그인 방지 + 401 시 1회 재로그인 */
class ServiceSession {
  private cookie: string | null = null;
  private pending: Promise<string> | null = null;

  private async login(): Promise<string> {
    const id = Number(process.env.MIRAEPASS_SERVICE_ID);
    const password = process.env.MIRAEPASS_SERVICE_PASSWORD ?? "";
    if (!id || !password) throw new MiraepassError("UNAVAILABLE", "서비스 계정 환경변수가 설정되지 않았어요");
    const res = await call(() => sdk().loginAuthLoginPost({ body: { id, password } }));
    unwrap(res, { 401: "UNAUTHORIZED" });
    const cookie = extractSessionCookie(res.response);
    if (!cookie) throw new MiraepassError("UNAVAILABLE", "서비스 계정 세션 쿠키를 받지 못했어요");
    return cookie;
  }

  async get(force = false): Promise<string> {
    if (this.cookie && !force) return this.cookie;
    this.pending ??= this.login().finally(() => (this.pending = null));
    this.cookie = await this.pending;
    return this.cookie;
  }

  async run<T>(fn: (api: MiraepassApi) => Promise<SdkResult>, map?: Parameters<typeof unwrap>[1]): Promise<T> {
    let res = await call(async () => fn(sdk(await this.get())));
    if (res.response?.status === 401) {
      res = await call(async () => fn(sdk(await this.get(true))));
    }
    return unwrap<T>(res, map);
  }
}

declare global {
  var __mpService: ServiceSession | undefined;
}
const service = (globalThis.__mpService ??= new ServiceSession());

export const realGateway: MiraepassGateway = {
  async findStudent(studentId) {
    const list = await service.run<User[]>((api) =>
      api.searchSearchGet({ query: { q: String(studentId), t: [UserType.STUDENT] } }),
    );
    const user = list?.find((u) => u.id === studentId && u.type === UserType.STUDENT);
    return user ? toMPUser(user) : null;
  },

  async searchTeachers(name) {
    const q = name.trim();
    if (!q) return [];
    const list = await service.run<User[]>((api) => api.searchSearchGet({ query: { q, t: [UserType.TEACHER] } }));
    return (list ?? []).filter((u) => u.type === UserType.TEACHER).map(toMPUser);
  },

  async resolveCustomer(type: CustomerType, id: number, name?: string) {
    if (type === "student") return this.findStudent(id);
    if (!name) return null;
    const list = await this.searchTeachers(name);
    return list.find((u) => u.id === id) ?? null;
  },

  async deduct(userId, amount, memo) {
    return service.run<number>(
      (api) =>
        api.deductPointsPointDeductPost({
          body: { target_user_id: userId, amount, memo, change_type: PointHistoryType.CAFE },
        }),
      { 400: "INSUFFICIENT_POINT", 404: "USER_NOT_FOUND" },
    );
  },

  async grant(userId, amount, memo) {
    await service.run<void>(
      (api) =>
        api.grantPointsPointGrantPost({
          body: { target_user_id: userId, amount, memo, change_type: PointHistoryType.CAFE },
        }),
      { 404: "USER_NOT_FOUND", 429: "LIMIT_EXCEEDED" },
    );
  },

  async verifyCredentials(id, password) {
    const res = await call(() => sdk().loginAuthLoginPost({ body: { id, password } }));
    const user = unwrap<User>(res, { 401: "INVALID_CREDENTIALS", 422: "INVALID_CREDENTIALS" });
    const cookie = extractSessionCookie(res.response);
    if (cookie) {
      // 키오스크는 사용자 세션을 보관하지 않는다
      await call(() => sdk(cookie).logoutAuthLogoutPost()).catch(() => undefined);
    }
    return toMPUser(user);
  },
};
