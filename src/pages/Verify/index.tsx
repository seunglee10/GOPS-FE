/* 이메일 인증 화면. 목업 gops.js pageVerify() 3233~3246줄, 제출 3551줄. 계약 D37
   - 남은 시간: 서버가 코드를 보낸 때(가입·재전송 응답을 받은 때)부터 5분
   - 다시 보내기: resendAfterSeconds / retryAfterSeconds 동안 막고 남은 초를 보여 준다
   - 성공하면 홈의 투자 경험 대화상자로 (index.html?dialog=profile&welcome=1&signup=1) */
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useQ } from "../../app/query";
import { useToast } from "../../app/shell/ToastProvider";
import { Ic } from "../../app/icons";
import { dataSourceKind } from "../../data/source";
import { useAuth } from "../../auth/AuthProvider";
import { Stepper, loadingClass } from "../../auth/AuthParts";
import {
  AFTER_SIGNUP, authErrorMessage, CODE_TTL_SECONDS, DEMO_EMAIL, EmailAuthError, formatCountdown, pendingVerify, RESEND_SECONDS, secondsLeft, type AuthMessage, type PendingVerify,
} from "../../auth/emailAuthApi";

export default function VerifyPage() {
  usePage("verify");
  const { q } = useQ();
  const mock = dataSourceKind() === "mock";
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const demoErr = mock && q("err") === "1";
  const [pending, setPending] = useState<PendingVerify | null>(() => pendingVerify.get() ?? (mock ? pendingVerify.sent(DEMO_EMAIL, RESEND_SECONDS) : null));
  const [code, setCode] = useState(demoErr ? "381920" : mock ? "38" : "");
  const [err, setErr] = useState<AuthMessage | null>(demoErr ? authErrorMessage(new EmailAuthError(400, "invalid_code", 4), "verify") : null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (!pending) return <Navigate to="/signup" replace />;   // 가입을 거치지 않고 들어왔다
  const email = pending.email;
  const left = secondsLeft(pending.sentAt + CODE_TTL_SECONDS * 1000, now);
  const wait = secondsLeft(pending.resendAt, now);
  const expired = left === 0;
  const help = err ?? (expired ? authErrorMessage(new EmailAuthError(410, "expired"), "verify") : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (code.length !== 6) { setErr({ text: "6자리 코드를 모두 넣어 주세요." }); return; }
    setBusy(true);
    try {
      await auth.email.verify(email, code);
      pendingVerify.set(null);
      navigate(AFTER_SIGNUP, { replace: true });
    } catch (caught) {
      setErr(authErrorMessage(caught, "verify"));
      setBusy(false);
    }
  }

  async function resend() {
    if (wait > 0) return;
    try {
      const r = await auth.email.resend(email);
      setPending(pendingVerify.sent(email, r.resendAfterSeconds));
      setErr(null); setCode(""); setNow(Date.now());
      toast("새 코드를 보냈어요. 메일함을 확인해 주세요.");
    } catch (caught) {
      if (caught instanceof EmailAuthError && caught.code === "too_soon") {
        const p = { ...pending!, resendAt: Date.now() + (caught.retryAfterSeconds ?? RESEND_SECONDS) * 1000 };
        pendingVerify.set(p); setPending(p);
      }
      toast(authErrorMessage(caught, "resend").text, { error: true });
    }
  }

  const tip = wait > 0 ? authErrorMessage(new EmailAuthError(429, "too_soon", undefined, wait), "resend").text : undefined;
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <Stepper cur={2} labels={["계정 만들기", "이메일 인증", "투자 경험"]} />
      <h1>이메일 인증</h1><p className="sub"><b>{email}</b>으로 6자리 코드를 보냈어요. 메일에 적힌 숫자를 넣어 주세요.</p>
      <form id="verifyform" noValidate onSubmit={e => void submit(e)}>
        <div className="field"><label htmlFor="code">인증 코드</label>
          <div className={`input code ${help ? "invalid" : ""}`}><input id="code" inputMode="numeric" maxLength={6} value={code} autoComplete="one-time-code" aria-invalid={!!help || undefined}
            onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (err) setErr(null); }} /><span className="timer" aria-label="남은 시간">{formatCountdown(left)}</span></div>
          {help ? <span className="help error"><Ic name="warn" />{help.text}</span> : <span className="help">5분 안에 입력해 주세요.</span>}</div>
        <button type="submit" className={loadingClass(busy)}>인증하고 계속하기</button>
      </form>
      <p className="foot">메일이 안 왔나요? 스팸함을 확인하거나 <button type="button" className="linkbtn" aria-disabled={wait > 0 ? "true" : undefined} data-tip={tip} onClick={() => void resend()}>다시 보내기{wait > 0 ? ` (${wait}초)` : ""}</button></p>
      <p className="foot"><Link to="/signup">이메일 주소 바꾸기</Link></p>
    </div></section></div>
  );
}
