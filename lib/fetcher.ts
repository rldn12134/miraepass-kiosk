import type { ApiErrorCode } from "./types";

export class ClientApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const KIOSK_TOKEN_KEY = "mp-cafe:kiosk-token";

export function getKioskToken(): string | null {
  try {
    return localStorage.getItem(KIOSK_TOKEN_KEY);
  } catch {
    return null;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; kiosk?: boolean };

/** `{ success, data }` 봉투를 풀고 실패 시 ClientApiError를 던지는 fetch 래퍼 */
export async function api<T>(path: string, { body, kiosk, headers, ...init }: Options = {}): Promise<T> {
  const h = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) h.set("Content-Type", "application/json");
  if (kiosk) {
    const token = getKioskToken();
    if (token) h.set("X-Kiosk-Token", token);
  }
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: h,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ClientApiError("INTERNAL", "서버에 연결할 수 없어요. 네트워크를 확인해 주세요", 0);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const { code = "INTERNAL", message = "요청에 실패했어요", success: _s, ...extra } = json ?? {};
    throw new ClientApiError(code, message, res.status, extra);
  }
  return json.data as T;
}
