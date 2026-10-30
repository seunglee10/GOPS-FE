/* 이메일 가입·인증·로그인·비밀번호 재설정·약관 동의 (계약 D35~D39, GOPS-BE app/auth_email/routes.py).
   - 오류 코드 → 화면 문구는 이 파일의 authErrorMessage 한 곳에서만 정한다
   - 비밀번호 규칙, 남은 시간 표시처럼 화면이 바로 쓰는 계산도 여기 둔다 (tests/emailAuth.test.ts)
   - 비밀번호와 인증 코드는 어디에도 남기지 않는다. 로그·저장소에 쓰지 말 것 */

export const DEMO_EMAIL = "seung@example.com";
export const DEMO_NAME = "승리";
export const CODE_TTL_SECONDS = 5 * 60;      // 인증 코드 5분
export const RESEND_SECONDS = 30;            // 재전송 30초 간격
export const LOGIN_MAX_FAILURES = 5;         // 5번 틀리면 10분 잠금
/* 인증·약관 동의를 마치면 홈의 투자 경험 대화상자로 (목업 3551·3552줄) */
export const AFTER_SIGNUP = "/?dialog=profile&welcome=1&signup=1";

export type Consents = { tos: boolean; privacy: boolean; age: boolean; mkt: boolean };
export type EmailAuthUser = {
  email: string | null; name?: string | null; picture?: string | null; provider?: string;
  emailVerified?: boolean; needsConsent?: boolean; experience?: "new" | "some" | "pro" | null;
};

/* ---------- 오류 ---------- */
export type AuthErrorCode =
  | "invalid_credentials" | "locked" | "unverified" | "email_taken" | "weak_password" | "consent_required"
  | "invalid_email" | "invalid_code" | "expired" | "too_soon" | "invalid_token" | "unauthenticated" | "network" | "unknown";
const KNOWN: AuthErrorCode[] = ["invalid_credentials", "locked", "unverified", "email_taken", "weak_password", "consent_required",
  "invalid_email", "invalid_code", "expired", "too_soon", "invalid_token"];

export class EmailAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: AuthErrorCode,
    readonly remainingAttempts?: number,
    readonly retryAfterSeconds?: number,
    readonly lockedUntil?: string,
  ) { super(`auth ${status} ${code}`); this.name = "EmailAuthError"; }
}

/* 서버 응답 { detail: { code, remainingAttempts | retryAfterSeconds | lockedUntil } } 를 오류 객체로 */
export function parseAuthError(status: number, payload: unknown): EmailAuthError {
  const detail = payload && typeof payload === "object" ? (payload as Record<string, unknown>).detail : undefined;
  const d = detail && typeof detail === "object" ? detail as Record<string, unknown> : {};
  const raw = typeof d.code === "string" ? d.code : "";
  const code: AuthErrorCode = (KNOWN as string[]).includes(raw) ? raw as AuthErrorCode : status === 401 ? "unauthenticated" : "unknown";
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  return new EmailAuthError(status, code, num(d.remainingAttempts), num(d.retryAfterSeconds), typeof d.lockedUntil === "string" ? d.lockedUntil : undefined);
}

export type AuthStep = "login" | "signup" | "verify" | "resend" | "forgot" | "reset" | "consent";
/* 배너는 <b>title</b> text, 입력칸 아래 도움말은 text 만 쓴다 */
export type AuthMessage = { title?: string; text: string };

const minutesLeft = (until: string | undefined, now: number): number => {
  const t = until ? Date.parse(until) : NaN;
  return Number.isFinite(t) ? Math.max(1, Math.ceil((t - now) / 60000)) : 10;
};

/* 오류 코드 → 목업 문구. 화면은 이 함수만 부른다 */
export function authErrorMessage(err: unknown, step: AuthStep, now = Date.now()): AuthMessage {
  const e = err instanceof EmailAuthError ? err : new EmailAuthError(0, "network");
  switch (e.code) {
    case "invalid_credentials":
      return { title: "이메일 또는 비밀번호가 맞지 않아요.", text: `${LOGIN_MAX_FAILURES}번 틀리면 10분 동안 로그인할 수 없어요.${e.remainingAttempts != null ? ` 남은 시도 ${e.remainingAttempts}번.` : ""}` };
    case "locked":
      return { title: "로그인을 잠시 막았어요.", text: `비밀번호를 ${LOGIN_MAX_FAILURES}번 틀려서 10분 동안 로그인할 수 없어요. ${minutesLeft(e.lockedUntil, now)}분 뒤에 다시 시도해 주세요.` };
    case "unverified":
      return { title: "이메일 인증을 아직 마치지 않았어요.", text: "메일로 받은 6자리 코드를 넣으면 로그인할 수 있어요." };
    case "email_taken": return { text: "이미 가입된 이메일이에요." };
    case "weak_password": return { text: "비밀번호 조건을 모두 채워 주세요." };
    case "consent_required": return { text: "필수 약관에 모두 동의해 주세요." };
    case "invalid_email": return { text: "이메일을 정확히 입력해 주세요." };
    case "invalid_code": return { text: `코드가 맞지 않아요.${e.remainingAttempts != null ? ` 남은 시도 ${e.remainingAttempts}번.` : ""}` };
    case "expired":
      return step === "reset"
        ? { title: "링크가 만료됐어요.", text: "링크는 30분 동안 쓸 수 있어요. 비밀번호 찾기를 다시 해 주세요." }
        : { text: "코드가 만료됐어요. 다시 보내기를 눌러 새 코드를 받아 주세요." };
    case "too_soon": return { text: `방금 보냈어요. ${e.retryAfterSeconds ?? RESEND_SECONDS}초 뒤에 다시 보낼 수 있어요.` };
    case "invalid_token": return { title: "링크가 맞지 않아요.", text: "메일에 있는 링크를 다시 눌러 보거나 비밀번호 찾기를 다시 해 주세요." };
    case "unauthenticated": return { text: "로그인이 풀렸어요. 다시 로그인해 주세요." };
    case "network": return { text: "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
    default: return { text: "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
}
export const messageText = (m: AuthMessage): string => (m.title ? `${m.title} ${m.text}` : m.text);

/* ---------- 입력 확인 (목업 validateAuth 3275~3292줄) ---------- */
export const isEmail = (v: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
export type PasswordRule = { label: string; ok: boolean };
export function passwordRules(v: string): PasswordRule[] {
  return [{ label: "8자 이상", ok: v.length >= 8 }, { label: "영문 포함", ok: /[a-zA-Z]/.test(v) }, { label: "숫자 포함", ok: /\d/.test(v) }];
}
export const passwordOk = (v: string): boolean => passwordRules(v).every(r => r.ok);
export const requiredConsentsOk = (c: Consents): boolean => c.tos && c.privacy && c.age;

/* 가입·약관 버튼을 막는 이유. 빈 문자열이면 누를 수 있다. 확인 순서는 목업과 같다 */
export function submitBlockReason(f: { email?: string; password?: string; password2?: string; consents: Consents; taken?: boolean }): string {
  if (f.email != null && !isEmail(f.email)) return "이메일을 정확히 입력해 주세요.";
  if (f.password != null && !passwordOk(f.password)) return "비밀번호 조건을 모두 채워 주세요.";
  if (f.password2 != null && f.password2 !== f.password) return "비밀번호 확인이 달라요.";
  if (!requiredConsentsOk(f.consents)) return "필수 약관에 모두 동의해 주세요.";
  if (f.taken) return "이미 가입된 이메일이에요.";
  return "";
}

/* ---------- 남은 시간 ---------- */
export const secondsLeft = (untilMs: number, now = Date.now()): number => Math.max(0, Math.ceil((untilMs - now) / 1000));
/* 304 → "05:04". 음수는 00:00 */
export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* 인증 코드를 보낸 시각. 새로고침해도 타이머가 이어지게 sessionStorage 에 이메일과 시각만 둔다 */
export type PendingVerify = { email: string; sentAt: number; resendAt: number };
const PENDING_KEY = "gops.verify";
export const pendingVerify = {
  get(): PendingVerify | null {
    try {
      const v = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null") as PendingVerify | null;
      return v && typeof v.email === "string" && typeof v.sentAt === "number" && typeof v.resendAt === "number" ? v : null;
    } catch { return null; }
  },
  set(v: PendingVerify | null): void { try { v ? sessionStorage.setItem(PENDING_KEY, JSON.stringify(v)) : sessionStorage.removeItem(PENDING_KEY); } catch { /* 저장 못 해도 화면은 돈다 */ } },
  /* 방금 보냈다: 코드 5분, 재전송은 resendAfterSeconds 뒤 */
  sent(email: string, resendAfterSeconds: number, now = Date.now()): PendingVerify {
    const v = { email, sentAt: now, resendAt: now + resendAfterSeconds * 1000 }; this.set(v); return v;
  },
};
/* 비밀번호 찾기에서 넣은 이메일 (보냈어요 화면과 새 비밀번호 화면에 보여 준다) */
const FORGOT_KEY = "gops.forgot";
export const forgotEmail = {
  get(): string | null { try { return sessionStorage.getItem(FORGOT_KEY); } catch { return null; } },
  set(v: string | null): void { try { v ? sessionStorage.setItem(FORGOT_KEY, v) : sessionStorage.removeItem(FORGOT_KEY); } catch { /* 무시 */ } },
};

/* ---------- 요청 ---------- */
export interface EmailAuthClient {
  signup(email: string, password: string, consents: Consents): Promise<{ resendAfterSeconds: number }>;
  verify(email: string, code: string): Promise<{ user: EmailAuthUser }>;
  resend(email: string): Promise<{ resendAfterSeconds: number }>;
  login(email: string, password: string, remember: boolean): Promise<{ user: EmailAuthUser }>;
  forgot(email: string): Promise<void>;
  reset(token: string, password: string): Promise<void>;
  consent(consents: Consents): Promise<void>;
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new EmailAuthError(0, "network");
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw parseAuthError(res.status, payload);
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
}
const userOf = (p: Record<string, unknown>): EmailAuthUser => (p.user && typeof p.user === "object" ? p.user as EmailAuthUser : { email: null });
const resendOf = (p: Record<string, unknown>): number => (typeof p.resendAfterSeconds === "number" ? p.resendAfterSeconds : RESEND_SECONDS);

export const apiEmailAuth: EmailAuthClient = {
  async signup(email, password, consents) { return { resendAfterSeconds: resendOf(await post("/api/auth/email/signup", { email, password, consents })) }; },
  async verify(email, code) { return { user: userOf(await post("/api/auth/email/verify", { email, code })) }; },
  async resend(email) { return { resendAfterSeconds: resendOf(await post("/api/auth/email/resend", { email })) }; },
  async login(email, password, remember) { return { user: userOf(await post("/api/auth/email/login", { email, password, remember })) }; },
  async forgot(email) { await post("/api/auth/password/forgot", { email }); },
  async reset(token, password) { await post("/api/auth/password/reset", { token, password }); },
  async consent(consents) { await post("/api/auth/consent", consents); },
};

/* 목업 모드: 서버 없이 목업처럼 0.7초 뒤 성공한다. 오류 화면은 주소의 ?err= 로 본다 */
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const DEMO_USER: EmailAuthUser = { email: DEMO_EMAIL, name: DEMO_NAME, picture: null, provider: "email", emailVerified: true, needsConsent: false, experience: null };
export const mockEmailAuth: EmailAuthClient = {
  async signup() { await wait(700); return { resendAfterSeconds: RESEND_SECONDS }; },
  async verify() { await wait(700); return { user: DEMO_USER }; },
  async resend() { await wait(300); return { resendAfterSeconds: RESEND_SECONDS }; },
  async login() { await wait(700); return { user: DEMO_USER }; },
  async forgot() { await wait(300); },
  async reset() { await wait(300); },
  async consent() { await wait(600); },
};
