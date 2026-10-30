/* 회원가입 화면. 목업 gops.js pageSignup() 3213~3231줄, 실시간 확인 validateAuth() 3275줄, 제출 3550줄.
   계약 D36 POST /api/auth/email/signup → 인증 코드 메일 → /verify */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useQ } from "../../app/query";
import { useToast } from "../../app/shell/ToastProvider";
import { Ic } from "../../app/icons";
import { dataSourceKind } from "../../data/source";
import { prefs } from "../../app/store";
import { useAuth } from "../../auth/AuthProvider";
import { GoogleG, PwField, PwMatch, PwRules, Stepper, SubmitWrap, TermsBlock, useTerms } from "../../auth/AuthParts";
import { authErrorMessage, DEMO_EMAIL, EmailAuthError, pendingVerify, submitBlockReason } from "../../auth/emailAuthApi";

export default function SignupPage() {
  usePage("signup");
  const { q } = useQ();
  const mock = dataSourceKind() === "mock";
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fill = mock && q("demo") === "fill", demoDup = mock && q("err") === "dup";
  const [email, setEmail] = useState(fill || demoDup ? DEMO_EMAIL : "");
  const [pw, setPw] = useState(fill ? "gops2026" : "");
  const [pw2, setPw2] = useState(fill ? "gops2026" : "");
  const terms = useTerms(fill);
  /* 서버가 409 email_taken 을 준 이메일. 주소를 바꾸면 풀린다 */
  const [takenEmail, setTakenEmail] = useState<string | null>(demoDup ? DEMO_EMAIL : null);
  const [busy, setBusy] = useState(false);
  const dup = takenEmail != null && takenEmail === email.trim().toLowerCase();
  const reason = submitBlockReason({ email, password: pw, password2: pw2, consents: terms.consents, taken: dup });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || reason) return;
    setBusy(true);
    const addr = email.trim();
    try {
      const r = await auth.email.signup(addr, pw, terms.consents);
      pendingVerify.sent(addr, r.resendAfterSeconds);
      navigate("/verify");
    } catch (caught) {
      if (caught instanceof EmailAuthError && caught.code === "email_taken") setTakenEmail(addr.toLowerCase());
      else toast(authErrorMessage(caught, "signup").text, { error: true });
      setBusy(false);
    }
  }

  function google() {
    if (mock) { prefs.guest.set(false); navigate("/google"); return; }   // 목업 3340줄 data-next="google.html"
    auth.loginWith("google", "/google");
  }

  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <Stepper cur={1} labels={["계정 만들기", "이메일 인증", "투자 경험"]} />
      <h1>회원가입</h1><p className="sub">가입하면 $10,000 모의투자 계좌가 바로 열려요.</p>
      <form id="signupform" noValidate onSubmit={e => void submit(e)}>
        <div className="field"><label htmlFor="su-email">이메일</label><div className={`input ${dup ? "invalid" : ""}`}><input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={dup || undefined} /></div>
          {dup ? <span className="help error"><Ic name="warn" /><span>이미 가입된 이메일이에요. <Link to="/login">로그인</Link>하거나 <Link to="/forgot">비밀번호를 찾아</Link> 보세요.</span></span>
            : <span className="help">로그인할 때 아이디로 써요.</span>}</div>
        <PwField id="su-pw" label="비밀번호" value={pw} onChange={setPw} />
        <PwRules value={pw} />
        <PwField id="su-pw2" label="비밀번호 확인" value={pw2} onChange={setPw2} />
        <PwMatch pw={pw} pw2={pw2} />
        <TermsBlock terms={terms} />
        <SubmitWrap reason={reason} busy={busy}>가입하고 인증 메일 받기</SubmitWrap>
      </form>
      <div className="or"><span>또는</span></div>
      <button className="btn lg block gbtn" onClick={google}><GoogleG />Google로 가입하기</button>
    </div></section></div>
  );
}
