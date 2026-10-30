import assert from "node:assert/strict";
import {
  authErrorMessage, EmailAuthError, formatCountdown, isEmail, messageText, parseAuthError, passwordOk, passwordRules,
  secondsLeft, submitBlockReason, type Consents,
} from "../src/auth/emailAuthApi";
import { safeReturnTo } from "../src/auth/AuthProvider";

/* 서버 오류 → 오류 객체 */
{
  const e = parseAuthError(401, { detail: { code: "invalid_credentials", remainingAttempts: 3 } });
  assert.equal(e.code, "invalid_credentials");
  assert.equal(e.remainingAttempts, 3);
  assert.equal(parseAuthError(429, { detail: { code: "too_soon", retryAfterSeconds: 12 } }).retryAfterSeconds, 12);
  assert.equal(parseAuthError(423, { detail: { code: "locked", lockedUntil: "2026-10-30T10:10:00Z" } }).lockedUntil, "2026-10-30T10:10:00Z");
  assert.equal(parseAuthError(503, { detail: "auth is disabled" }).code, "unknown");
  assert.equal(parseAuthError(401, { detail: "authentication required" }).code, "unauthenticated");
  assert.equal(parseAuthError(500, null).code, "unknown");
}

/* 오류 코드 → 목업 문구 */
{
  const login = authErrorMessage(new EmailAuthError(401, "invalid_credentials", 3), "login");
  assert.equal(login.title, "이메일 또는 비밀번호가 맞지 않아요.");
  assert.equal(login.text, "5번 틀리면 10분 동안 로그인할 수 없어요. 남은 시도 3번.");
  const now = Date.parse("2026-10-30T10:00:00Z");
  const locked = authErrorMessage(new EmailAuthError(423, "locked", undefined, undefined, "2026-10-30T10:09:30Z"), "login", now);
  assert.match(locked.text, /10분 뒤에 다시 시도해 주세요\.$/);
  assert.equal(authErrorMessage(new EmailAuthError(400, "invalid_code", 4), "verify").text, "코드가 맞지 않아요. 남은 시도 4번.");
  assert.equal(authErrorMessage(new EmailAuthError(429, "too_soon", undefined, 28), "resend").text, "방금 보냈어요. 28초 뒤에 다시 보낼 수 있어요.");
  assert.equal(authErrorMessage(new EmailAuthError(409, "email_taken"), "signup").text, "이미 가입된 이메일이에요.");
  assert.equal(authErrorMessage(new EmailAuthError(422, "weak_password"), "signup").text, "비밀번호 조건을 모두 채워 주세요.");
  assert.equal(authErrorMessage(new EmailAuthError(422, "consent_required"), "consent").text, "필수 약관에 모두 동의해 주세요.");
  assert.notEqual(authErrorMessage(new EmailAuthError(410, "expired"), "verify").text, authErrorMessage(new EmailAuthError(410, "expired"), "reset").text);
  assert.equal(authErrorMessage(new EmailAuthError(403, "unverified"), "login").title, "이메일 인증을 아직 마치지 않았어요.");
  assert.equal(authErrorMessage(new TypeError("fetch failed"), "login").text, "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  assert.equal(messageText({ title: "a", text: "b" }), "a b");
  /* 모든 코드가 빈 문구 없이 나온다 */
  for (const code of ["invalid_credentials", "locked", "unverified", "email_taken", "weak_password", "consent_required", "invalid_email", "invalid_code", "expired", "too_soon", "invalid_token", "unauthenticated", "network", "unknown"] as const) {
    assert.ok(authErrorMessage(new EmailAuthError(400, code), "login").text.length > 0, code);
  }
}

/* 비밀번호 규칙 (8자·영문·숫자) */
{
  assert.deepEqual(passwordRules("").map(r => r.ok), [false, false, false]);
  assert.deepEqual(passwordRules("abc").map(r => r.ok), [false, true, false]);
  assert.deepEqual(passwordRules("12345678").map(r => r.ok), [true, false, true]);
  assert.deepEqual(passwordRules("gops2026").map(r => r.label), ["8자 이상", "영문 포함", "숫자 포함"]);
  assert.equal(passwordOk("gops2026"), true);
  assert.equal(passwordOk("gopsgops"), false);
  assert.equal(isEmail("seung@example.com"), true);
  assert.equal(isEmail("seung@example"), false);
}

/* 가입 버튼을 막는 이유 (목업 validateAuth 순서) */
{
  const all: Consents = { tos: true, privacy: true, age: true, mkt: false };
  assert.equal(submitBlockReason({ email: "x", password: "gops2026", password2: "gops2026", consents: all }), "이메일을 정확히 입력해 주세요.");
  assert.equal(submitBlockReason({ email: "a@b.co", password: "short", password2: "short", consents: all }), "비밀번호 조건을 모두 채워 주세요.");
  assert.equal(submitBlockReason({ email: "a@b.co", password: "gops2026", password2: "gops2027", consents: all }), "비밀번호 확인이 달라요.");
  assert.equal(submitBlockReason({ email: "a@b.co", password: "gops2026", password2: "gops2026", consents: { ...all, age: false } }), "필수 약관에 모두 동의해 주세요.");
  assert.equal(submitBlockReason({ email: "a@b.co", password: "gops2026", password2: "gops2026", consents: all, taken: true }), "이미 가입된 이메일이에요.");
  assert.equal(submitBlockReason({ email: "a@b.co", password: "gops2026", password2: "gops2026", consents: all }), "");
  assert.equal(submitBlockReason({ consents: all }), "");
}

/* 남은 시간 */
{
  assert.equal(formatCountdown(300), "05:00");
  assert.equal(formatCountdown(272), "04:32");
  assert.equal(formatCountdown(9), "00:09");
  assert.equal(formatCountdown(-3), "00:00");
  assert.equal(secondsLeft(10_000, 0), 10);
  assert.equal(secondsLeft(10_000, 9_001), 1);
  assert.equal(secondsLeft(10_000, 12_000), 0);
}

/* next= 는 같은 출처만 */
{
  assert.equal(safeReturnTo("/stock?s=NVDA"), "/stock?s=NVDA");
  assert.equal(safeReturnTo("//evil.com"), "/");
  assert.equal(safeReturnTo("/\t/evil.com"), "/");
  assert.equal(safeReturnTo("/\n//evil.com"), "/");
  assert.equal(safeReturnTo("/\t\\evil.com"), "/");
  assert.equal(safeReturnTo("/login?next=/x"), "/");
  assert.equal(safeReturnTo("/news?n=3#top"), "/news?n=3#top");
  assert.equal(safeReturnTo("/\\evil.com"), "/");
  assert.equal(safeReturnTo("https://evil.com"), "/");
  assert.equal(safeReturnTo("/login?next=/"), "/");
  assert.equal(safeReturnTo(null), "/");
}
