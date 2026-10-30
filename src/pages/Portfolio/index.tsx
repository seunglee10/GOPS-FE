/* 내 계좌 화면. 목업 gops.js 의 pagePortfolio() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function PortfolioPage() {
  usePage("portfolio");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">내 계좌</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>내 계좌</h3><p>보유 종목, 주문 내역, 규칙, 관심 종목이 여기 들어와요.</p></div></div>
    </section>
  );
}
