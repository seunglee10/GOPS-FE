/* 회원가입 화면. 목업 gops.js 의 pageSignup() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function SignupPage() {
  usePage("signup");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>회원가입</h1><p className="sub">가입하면 $10,000 모의투자 계좌가 바로 열려요.</p>
    </div></section></div>
  );
}
