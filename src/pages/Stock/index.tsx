/* 종목 화면. 목업 gops.js 의 pageStock() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function StockPage() {
  usePage("stock");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">종목</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>종목</h3><p>차트, 호가, 주문, AI 분석 패널이 여기 들어와요.</p></div></div>
    </section>
  );
}
