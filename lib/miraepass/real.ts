import { MiraepassApi, PointHistoryType, UserType, type User } from "@miraepass/api-client";
import { createClient } from "@miraepass/api-client/client";
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

  /** 401이면 한 번 재로그인 후 재시도한 원본 결과 */
  async runRaw(fn: (api: MiraepassApi) => Promise<SdkResult>): Promise<SdkResult> {
    const res = await call(async () => fn(sdk(await this.get())));
    if (res.response?.status !== 401) return res;
    return call(async () => fn(sdk(await this.get(true))));
  }

  async run<T>(fn: (api: MiraepassApi) => Promise<SdkResult>, map?: Parameters<typeof unwrap>[1]): Promise<T> {
    return unwrap<T>(await this.runRaw(fn), map);
  }
}

declare global {
  var __mpService: ServiceSession | undefined;
}
const service = (globalThis.__mpService ??= new ServiceSession());

export const realGateway: MiraepassGateway = {
  async findUser(id) {
    // 4자리 이상 숫자 검색어는 ID(학번)와 정확히 일치하는 사용자만 돌려준다
    const list = await service.run<User[]>((api) =>
      api.searchSearchGet({ query: { q: String(id), t: [UserType.STUDENT, UserType.TEACHER] } }),
    );
    const user = list?.find((u) => u.id === id && (u.type === UserType.STUDENT || u.type === UserType.TEACHER));
    return user ? toMPUser(user) : null;
  },

  async verifyKioskPin(id, pin) {
    const res = await service.runRaw((api) =>
      api.kioskPasswordVerify({
        body: { id, password: pin },
        // 서버는 일치 여부를 응답 봉투의 success에 담는다. SDK의 응답 스키마 검사(data: boolean)를 거치지 않고 원본을 읽는다
        responseTransformer: async (data: unknown) => data,
      }),
    );
    const status = res.response?.status;
    if (status === 200) {
      const body = res.data as { success?: unknown; data?: unknown } | undefined;
      return body?.success === true && body.data !== false;
    }
    if (status === 400) throw new MiraepassError("PIN_NOT_SET", "키오스크 비밀번호가 설정되지 않았어요", 400);
    if (status === 404) throw new MiraepassError("USER_NOT_FOUND", "사용자를 찾을 수 없어요", 404);
    if (status === 403) throw new MiraepassError("FORBIDDEN", "서비스 계정으로만 비밀번호를 검사할 수 있어요", 403);
    throw new MiraepassError("UNAVAILABLE", messageOf(res.error), status);
  },

  async deduct(userId, amount, memo) {
    // 200(남은 잔액) 또는 204(본문 없음) 응답. 204면 잔액을 알 수 없으므로 null
    const balance = await service.run<number | undefined>(
      (api) =>
        api.deductPointsPointDeductPost({
          body: { target_user_id: userId, amount, memo, change_type: PointHistoryType.CAFE },
        }),
      { 400: "INSUFFICIENT_POINT", 404: "USER_NOT_FOUND" },
    );
    return typeof balance === "number" ? balance : null;
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
