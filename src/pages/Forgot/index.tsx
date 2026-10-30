/* 비밀번호 찾기. 목업 gops.js pageForgot() 3259~3273줄, 제출 3553~3554줄. 계약 D38
   step=email → POST /api/auth/password/forgot → step=sent
   메일의 링크 /forgot?step=reset&token=... → POST /api/auth/password/reset → /login?reset=1 (서버가 그 사용자의 세션을 모두 지운다) */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useQ } from "../../app/query";
import { useToast } from "../../app/shell/ToastProvider";
import { Ic } from "../../app/icons";
import { dataSourceKind } from "../../data/source";
import { useAuth } from "../../auth/AuthProvider";
import { Banner, PwField, PwMatch, PwRules, loadingClass } from "../../auth/AuthParts";
import { authErrorMessage, DEMO_EMAIL, EmailAuthError, forgotEmail, isEmail, passwordOk, type AuthMessage } from "../../auth/emailAuthApi";

export default function ForgotPage() {
  usePage("forgot");
  const { q } = useQ();
  const step = q("step") || "email";
  const mock = dataSourceKind() === "mock";
  const shown = forgotEmail.get() ?? (mock ? DEMO_EMAIL : "");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      {step === "sent" ? <Sent email={shown} /> : step === "reset" ? <Reset email={shown} token={new URLSearchParams(window.location.search).get("token") ?? (mock ? "demo" : "")} mock={mock} /> : <AskEmail initial={mock ? DEMO_EMAIL : ""} />}
    </div></section></div>
  );
}

function AskEmail({ initial }: { initial: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState(initial);
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const addr = email.trim();
    if (!isEmail(addr)) { setBad(true); toast("이메일을 정확히 입력해 주세요.", { error: true }); return; }
    setBusy(true);
    try {
      await auth.email.forgot(addr);   // 없는 이메일도 200 이라 가입 여부가 드러나지 않는다
      forgotEmail.set(addr);
      navigate("/forgot?step=sent");
    } catch (caught) {
      toast(authErrorMessage(caught, "forgot").text, { error: true });
      setBusy(false);
    }
  }
  return <>
    <h1>비밀번호 찾기</h1><p className="sub">가입한 이메일로 비밀번호를 다시 정하는 링크를 보내 드려요. Google로 가입했다면 Google로 계속하기를 눌러 주세요.</p>
    <form id="forgotform" noValidate onSubmit={e => void submit(e)}><div className="field"><label htmlFor="fg-email">이메일</label><div className={`input ${bad ? "invalid" : ""}`}><input id="fg-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setBad(false); }} /></div></div>
      <button type="submit" className={loadingClass(busy)}>재설정 링크 보내기</button></form>
    <p className="foot"><Link to="/login">로그인으로 돌아가기</Link></p>
  </>;
}

function Sent({ email }: { email: string }) {
  const auth = useAuth();
  const { toast } = useToast();
  const again = async () => {
    if (!email) return;
    try { await auth.email.forgot(email); toast("메일을 다시 보냈어요."); }
    catch (caught) { toast(authErrorMessage(caught, "forgot").text, { error: true }); }
  };
  return <div className="sentbox"><span className="ic"><Ic name="check" /></span><h1>메일을 보냈어요</h1><p className="sub"><b>{email}</b>으로 비밀번호 재설정 링크를 보냈어요. 링크는 30분 동안 쓸 수 있어요.</p>
    <Link className="btn lg block primary" to="/login">로그인으로 돌아가기</Link>
    <p className="foot">메일이 안 왔나요? 스팸함을 확인하거나 <Link to="/forgot?step=sent" onClick={e => { e.preventDefault(); void again(); }}>다시 보내기</Link></p></div>;
}

function Reset({ email, token: tokenProp, mock }: { email: string; token: string; mock: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  /* 토큰은 처음 한 번 읽어 두고 주소창에서는 지운다 (방문 기록·화면 공유로 새지 않게) */
  const [token] = useState(tokenProp);
  useEffect(() => { if (new URLSearchParams(window.location.search).has("token")) navigate("/forgot?step=reset", { replace: true }); }, [navigate]);
  const { toast } = useToast();
  const [pw, setPw] = useState(mock ? "gops2026!" : "");
  const [pw2, setPw2] = useState(mock ? "gops2026!" : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<AuthMessage | null>(token ? null : authErrorMessage(new EmailAuthError(400, "invalid_token"), "reset"));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!passwordOk(pw)) { toast("비밀번호 조건을 모두 채워 주세요.", { error: true }); return; }
    if (pw2 !== pw) { toast("비밀번호 확인이 달라요.", { error: true }); return; }
    setBusy(true);
    try {
      await auth.email.reset(token, pw);
      forgotEmail.set(null);
      navigate("/login?reset=1", { replace: true });
    } catch (caught) {
      setErr(authErrorMessage(caught, "reset"));
      setBusy(false);
    }
  }
  return <>
    <h1>새 비밀번호</h1><p className="sub">{email ? `${email} 계정의` : "이 계정의"} 비밀번호를 바꿔요. 바꾸면 다른 기기에서는 로그아웃돼요.</p>
    {err ? <Banner tone="error" msg={err}>{" "}<Link to="/forgot">비밀번호 찾기</Link></Banner> : null}
    <form id="resetform" noValidate onSubmit={e => void submit(e)}>
      <PwField id="su-pw" label="새 비밀번호" value={pw} onChange={setPw} /><PwRules value={pw} />
      <PwField id="su-pw2" label="새 비밀번호 확인" value={pw2} onChange={setPw2} /><PwMatch pw={pw} pw2={pw2} />
      <button type="submit" className={loadingClass(busy)}>비밀번호 바꾸기</button></form>
  </>;
}
