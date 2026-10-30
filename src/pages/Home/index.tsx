/* 홈 화면. 목업 gops.js 의 pageHome() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function HomePage() {
  usePage("home");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">홈</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>홈</h3><p>시장 지수, S&P 500 지도, 실시간 순위, 뉴스가 여기 들어와요.</p></div></div>
    </section>
  );
}
