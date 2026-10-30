/* 로그인 화면. 목업 gops.js pageLogin() 3196~3211줄, 제출 3544~3549줄. 계약 D35 POST /api/auth/email/login
   - 틀리면 남은 시도, 5번이면 잠금 안내 (서버의 remainingAttempts·lockedUntil)
   - 인증을 안 끝낸 계정(403 unverified)은 코드를 다시 보내고 인증 화면으로
   - 돌아갈 곳 next= 는 safeReturnTo 로 같은 출처만 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useQ } from "../../app/query";
import { useToast } from "../../app/shell/ToastProvider";
import { dataSourceKind } from "../../data/source";
import { prefs } from "../../app/store";
import { safeReturnTo, useAuth } from "../../auth/AuthProvider";
import { Banner, Check, GoogleG, PwField, loadingClass } from "../../auth/AuthParts";
import { authErrorMessage, DEMO_EMAIL, EmailAuthError, pendingVerify, RESEND_SECONDS, type AuthMessage } from "../../auth/emailAuthApi";

export default function LoginPage() {
  usePage("login");
  const { q } = useQ();
  const mock = dataSourceKind() === "mock";
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const demoErr = mock && q("err") === "1";   // 목업처럼 ?err=1 로 오류 화면을 본다
  const [email, setEmail] = useState(demoErr ? DEMO_EMAIL : "");
  const [pw, setPw] = useState(demoErr ? "wrongpass1" : "");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code: string; msg: AuthMessage } | null>(demoErr ? { code: "invalid_credentials", msg: authErrorMessage(new EmailAuthError(401, "invalid_credentials", 3), "login") } : null);
  const [empty, setEmpty] = useState({ email: false, pw: false });
  const next = safeReturnTo(q("next"));
  const invalid = !!err && (err.code === "invalid_credentials" || err.code === "locked");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !pw) {
      setEmpty({ email: !email.trim(), pw: !pw });
      toast("이메일과 비밀번호를 모두 입력해 주세요.", { error: true });
      return;
    }
    setEmpty({ email: false, pw: false });
    setBusy(true);
    try {
      const user = await auth.email.login(email.trim(), pw, remember);
      setPw("");
      navigate(user?.needsConsent ? "/google" : next, { replace: true });
    } catch (caught) {
      const code = caught instanceof EmailAuthError ? caught.code : "network";
      setErr({ code, msg: authErrorMessage(caught, "login") });
      setBusy(false);
    }
  }

  /* 인증을 못 끝낸 계정: 새 코드를 보내고 인증 화면으로. 30초 안에 또 누르면 남은 시간만큼 기다린다 */
  async function toVerify() {
    const addr = email.trim();
    try {
      const r = await auth.email.resend(addr);
      pendingVerify.sent(addr, r.resendAfterSeconds);
    } catch (caught) {
      if (caught instanceof EmailAuthError && caught.code === "too_soon") {
        const wait = caught.retryAfterSeconds ?? RESEND_SECONDS;
        const now = Date.now();
        pendingVerify.set({ email: addr, sentAt: now - (RESEND_SECONDS - wait) * 1000, resendAt: now + wait * 1000 });
      } else { toast(authErrorMessage(caught, "resend").text, { error: true }); return; }
    }
    navigate("/verify");
  }

  function google() {
    if (mock) { prefs.guest.set(false); navigate(next); return; }  // 목업 3340줄
    auth.loginWith("google", next);
  }

  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>로그인</h1><p className="sub">GOPS 계정으로 들어오세요.</p>
      {q("reset") === "1" ? <Banner tone="ok" msg={{ title: "비밀번호를 바꿨어요.", text: "새 비밀번호로 로그인해 주세요." }} /> : null}
      {err ? <Banner tone="error" msg={err.msg}>{err.code === "unverified" ? <> <button type="button" className="linkbtn" onClick={() => void toVerify()}>인증 코드 받기</button></> : null}</Banner> : null}
      <form id="loginform" noValidate onSubmit={e => void submit(e)}>
        <div className="field"><label htmlFor="login-email">이메일</label><div className={`input ${invalid || empty.email ? "invalid" : ""}`}><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div></div>
        <PwField id="login-pw" label="비밀번호" value={pw} onChange={setPw} invalid={invalid || empty.pw} />
        <div className="rowx"><Check as="span" on={remember} onToggle={() => setRemember(r => !r)}>로그인 상태 유지</Check><Link to="/forgot">비밀번호를 잊으셨나요?</Link></div>
        <button type="submit" className={loadingClass(busy)}>로그인</button>
      </form>
      <div className="or"><span>또는</span></div>
      <button className="btn lg block gbtn" onClick={google}><GoogleG />Google로 계속하기</button>
      <p className="foot">아직 계정이 없나요? <Link to="/signup">회원가입</Link></p>
    </div></section></div>
  );
}
