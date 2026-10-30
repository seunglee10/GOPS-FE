/* 이메일 인증 화면. 목업 gops.js 의 pageVerify() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function VerifyPage() {
  usePage("verify");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>이메일 인증</h1><p className="sub">메일에 적힌 숫자를 넣어 주세요.</p>
    </div></section></div>
  );
}
