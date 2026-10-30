/* api 모드 공용 요청 함수. 같은 출처 쿠키로 보내고, 서버 오류 { detail: { code } } 를 ApiError 로 바꾼다.
   네트워크가 끊겨 fetch 자체가 실패하면 status 0 인 ApiError 가 된다 */
import { readObject } from "../../shared/json";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  constructor(status: number, code: string | null, url: string) {
    super(`API ${status}${code ? ` ${code}` : ""}: ${url}`);
    this.name = "ApiError"; this.status = status; this.code = code;
  }
}

/** 응답 본문에서 오류 코드를 꺼낸다. { detail: { code } } 가 아니면 null */
export function errorCode(body: unknown): string | null {
  const detail = readObject(body)?.detail;
  const code = readObject(detail)?.code;
  return typeof code === "string" && code ? code : null;
}

export const isUnauthorized = (e: unknown): boolean => e instanceof ApiError && e.status === 401;
export const isNotFound = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

async function request(url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  } catch {
    throw new ApiError(0, "network", url);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorCode(body), url);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function getJson(url: string, init: RequestInit = {}): Promise<unknown> { return request(url, init); }
export function sendJson(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<unknown> {
  return request(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

/** 로그인이 필요한 목록 읽기: 401 이면 게스트로 보고 빈 값을 돌려준다 */
export async function guestEmpty<T>(load: () => Promise<T>, empty: T): Promise<T> {
  try { return await load(); }
  catch (e) { if (isUnauthorized(e)) return empty; throw e; }
}
