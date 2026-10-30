/* 투자 복기 화면. 목업 gops.js 의 pageCoach() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function CoachPage() {
  usePage("coach");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">투자 복기</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>투자 복기</h3><p>9월 주문 14건의 판단과 결과가 여기 들어와요.</p></div></div>
    </section>
  );
}
