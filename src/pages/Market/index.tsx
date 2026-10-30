/* S&P 500 지도 화면. 목업 gops.js 의 pageMarket() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function MarketPage() {
  usePage("market");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">S&P 500 지도</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>S&P 500 지도</h3><p>섹터별 지도가 한 화면을 다 써요.</p></div></div>
    </section>
  );
}
