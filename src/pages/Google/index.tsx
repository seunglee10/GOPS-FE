/* Google 계정으로 처음 오셨네요 화면. 목업 gops.js 의 pageGoogle() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function GooglePage() {
  usePage("google");
  return (
    <div className="auth"><section className="auth-form"><div className="auth-card">
      <h1>Google 계정으로 처음 오셨네요</h1><p className="sub">약관에 동의하면 바로 시작할 수 있어요.</p>
    </div></section></div>
  );
}
