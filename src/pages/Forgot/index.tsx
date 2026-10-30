/* 비밀번호 찾기 화면. 목업 gops.js 의 pageForgot() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function ForgotPage() {
  usePage("forgot");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>비밀번호 찾기</h1><p className="sub">가입한 이메일로 비밀번호를 다시 정하는 링크를 보내 드려요.</p>
    </div></section></div>
  );
}
