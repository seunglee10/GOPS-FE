/* Google 첫 가입: 계정 확인 + 약관 동의. 목업 gops.js pageGoogle() 3248~3257줄, 제출 3552줄.
   계약 D39: /api/auth/me 의 needsConsent 가 true 면 여기로 오고, POST /api/auth/consent 로 끝낸다 */
import { useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useToast } from "../../app/shell/ToastProvider";
import { dataSourceKind } from "../../data/source";
import { useAuth } from "../../auth/AuthProvider";
import { Stepper, SubmitWrap, TermsBlock, useTerms } from "../../auth/AuthParts";
import { AFTER_SIGNUP, authErrorMessage, DEMO_EMAIL, DEMO_NAME, submitBlockReason } from "../../auth/emailAuthApi";

export default function GooglePage() {
  usePage("google");
  const mock = dataSourceKind() === "mock";
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const terms = useTerms(true);
  const [busy, setBusy] = useState(false);
  const reason = submitBlockReason({ consents: terms.consents });

  if (!mock && !auth.loading) {
    if (!auth.user) return <Navigate to="/login" replace />;          // Google 로그인을 거치지 않았다
    if (!auth.user.needsConsent && !busy) return <Navigate to="/" replace />;   // 이미 동의한 계정
  }
  const name = mock ? DEMO_NAME : auth.user?.name || auth.user?.email?.split("@")[0] || "";
  const email = mock ? DEMO_EMAIL : auth.user?.email ?? "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || reason) return;
    setBusy(true);
    try {
      await auth.email.consent(terms.consents);
      navigate(AFTER_SIGNUP, { replace: true });
    } catch (caught) {
      toast(authErrorMessage(caught, "consent").text, { error: true });
      setBusy(false);
    }
  }

  /* 다른 계정: 지금 세션을 끝내고 로그인 화면으로 */
  const other = async (e: ReactMouseEvent) => {
    e.preventDefault();
    if (!mock && !(await auth.logout())) { toast("로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.", { error: true }); return; }
    navigate("/login", { replace: true });
  };

  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <Stepper cur={1} labels={["약관 동의", "투자 경험"]} />
      <h1>Google 계정으로 처음 오셨네요</h1><p className="sub">아래 계정으로 GOPS에 가입해요. 약관에 동의하면 바로 시작할 수 있어요.</p>
      <div className="gacct"><span className="gav">{name.slice(0, 1)}</span><span><b>{name}</b><span className="t-caption">{email}</span></span><Link to="/login" onClick={e => void other(e)}>다른 계정</Link></div>
      <form id="googleform" noValidate onSubmit={e => void submit(e)}>
        <TermsBlock terms={terms} />
        <SubmitWrap reason={reason} busy={busy}>동의하고 시작하기</SubmitWrap>
      </form>
    </div></section></div>
  );
}
