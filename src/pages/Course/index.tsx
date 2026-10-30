/* 차트 읽기 첫걸음 화면. 목업 gops.js 의 pageCourse() 를 옮길 자리. 지금은 틀만 있다 */
import { usePage } from "../../app/shell/Shell";

export default function CoursePage() {
  usePage("course");
  return (
    <section className="panel" style={{ minHeight: 320 }}>
      <div className="panel-head"><span className="t-label">차트 읽기 첫걸음</span></div>
      <div className="panel-body"><div className="state" style={{ minHeight: 240 }}><h3>차트 읽기 첫걸음</h3><p>실전 차트 문제가 여기 들어와요.</p></div></div>
    </section>
  );
}
