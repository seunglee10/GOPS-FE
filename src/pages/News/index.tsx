/* 뉴스 화면. 목업 gops.js 의 pageNews() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function NewsPage() {
  usePage("news");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">뉴스</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>뉴스</h3><p>분류 탭과 뉴스 포커스가 여기 들어와요.</p></div></div>
    </section>
  );
}
