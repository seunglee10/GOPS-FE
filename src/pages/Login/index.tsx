/* 로그인 화면. 목업 gops.js 의 pageLogin() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function LoginPage() {
  usePage("login");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>로그인</h1><p className="sub">GOPS 계정으로 들어오세요.</p>
    </div></section></div>
  );
}
