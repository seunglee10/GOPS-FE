/* 차트 읽기 코스. 목업 gops.js pageCourse(1737)·qBody(1720)·cqCheck(1596)·HINTS(1478).
   ?topic= 은 그 주제만, ?q= 는 그 문제. 맞힌 문제는 진행 훅(D30)에 남긴다 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CourseChart as CourseChartRaw, CourseQuestion as ApiQuestion } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions } from "../../app/shell/actions";
import { Ic } from "../../app/icons";
import { CourseChart, courseSourceInfo, courseSourceText, isCorrect, toggleTap, EMPTY_COURSE_STATE, type CourseAnswerState, type CourseQuestion } from "../../charts";
import { useCourse, useProgress } from "../../data/hooks";
import { TOPIC_NAME } from "../../data/terms";

/* 서버 문제(D29) → 차트 모듈이 쓰는 문제 모양 */
export function toChartQuestion(q: ApiQuestion): CourseQuestion {
  const band = q.band;
  return { id: q.id, kind: q.kind, fig: q.fig, ans: q.kind === "choice" ? (q.answer ?? undefined) : (q.answerSet ?? undefined), tol: q.tolerance ?? undefined, band: band ? () => band : undefined, count: q.count ?? undefined };
}

type St = CourseAnswerState & { offer: boolean };
const fresh = (hint = 0): St => ({ ...EMPTY_COURSE_STATE, hint, offer: false });

export default function CoursePage() {
  usePage("course");
  const act = useActions("course");
  const course = useCourse();
  const progress = useProgress();
  const topic = act.q("topic"), qid = act.q("q");
  const all = course.data?.questions ?? [];
  const list = all.filter(c => !topic || c.topic === topic);
  const solved = new Set(progress.data?.solved ?? []);
  /* 처음 고른 문제를 기억해 둔다: 주소에 q 가 없을 때 맞히자마자 다음 안 푼 문제로 넘어가 버리지 않게 */
  const [pinned, setPinned] = useState<string | null>(null);
  const cur = list.find(c => c.id === qid) || list.find(c => c.id === pinned) || list.find(c => !solved.has(c.id)) || list[0];
  useEffect(() => { if (!qid && cur && progress.data && pinned !== cur.id) setPinned(cur.id); }, [qid, cur, progress.data, pinned]);
  const [st, setSt] = useState<St>(fresh());
  const [stId, setStId] = useState<string | null>(null);
  if (cur && stId !== cur.id) { setStId(cur.id); setSt(fresh()); }
  const cq = useMemo(() => (cur ? toChartQuestion(cur) : null), [cur]);

  if (course.error) return <div className="state"><h3>실전 차트 데이터를 불러오지 못했어요</h3></div>;
  if (!course.data || !progress.data || !cur || !cq) return <div className="course" />;
  const C = course.data;
  const DAYS = Object.fromEntries(C.days.map(d => [d.day, d.titleKo]));
  const nDone = all.filter(c => solved.has(c.id)).length, pctDone = Math.round(nDone / all.length * 100);
  const qs = topic ? `&topic=${topic}` : "", idx = list.indexOf(cur), next = list[idx + 1];
  const days = [...new Set(list.map(c => c.day))];
  const chart: CourseChartRaw | undefined = cur.fig.chart ? C.charts[cur.fig.chart] : undefined;

  /* 판정. 틀렸고 남은 힌트가 있으면 정답 대신 힌트를 권한다 */
  const check = (s: St) => {
    const ok = isCorrect(cq, s);
    if (!ok && cur.hints.length && s.hint < 2) setSt({ ...s, offer: true });
    else { setSt({ ...s, checked: true, offer: false }); if (ok) void progress.mark.run(cur.id, true); }
  };
  const ready = cur.kind === "choice" ? st.choice != null : cur.kind === "level" ? st.level != null : st.sel.length > 0;
  const ok = st.checked && isCorrect(cq, st);
  const need = cur.kind === "tap" ? (cur.count || (cur.answerSet ?? []).length) : 0;
  const src = chart ? courseSourceText(courseSourceInfo(chart)) : "";
  const caption = `Day ${cur.day} · ${DAYS[cur.day]} · ${topic ? `${idx + 1}/${list.length}` : `${all.indexOf(cur) + 1}/${all.length}`}`;

  return <div className="course">
    <aside className="panel c-side">
      <div className="c-head"><h1>{C.titleKo}</h1>
        <p>실제로 있었던 차트로 캔들, 추세, 지지선, 거래량, RSI, PER 읽는 법을 익혀요. 하루에 몇 개씩 해도 돼요.</p>
        <div className="c-prog" aria-label={`진행률 ${pctDone}%`}><i style={{ width: `${Math.max(pctDone, 1)}%` }}></i></div><div className="c-pct"><b>{pctDone}%</b><span>실전 차트 {all.length}개 중 {nDone}개 완료</span></div></div>
      {topic && TOPIC_NAME[topic] ? <div className="c-filter"><span><b>{TOPIC_NAME[topic]}</b> 실전 차트만 보는 중 ({list.length}개)</span><Link to="/course">전체 코스 보기</Link></div> : null}
      <ol className="c-days">{days.map(d => <li key={d}><h3>Day {d}<span>{DAYS[d]}</span></h3>
        {list.filter(c => c.day === d).map(c => <Link key={c.id} className="c-q" to={`/course?q=${c.id}${qs}`} aria-current={c === cur ? "true" : "false"}><span className="mk">{solved.has(c.id) ? <Ic name="check" /> : null}</span>{c.title}</Link>)}</li>)}</ol>
    </aside>
    <section className="panel c-main">
      <div className="c-qhead"><span className="t-caption">{caption}</span><h2>{cur.title}</h2><p>{cur.prompt}</p></div>
      <CourseChart className="c-fig" q={cq} chart={chart} state={st} onTap={i => setSt({ ...st, sel: toggleTap(cq, st.sel, i), offer: false })} onLevel={p => setSt({ ...st, level: p, offer: false })} />
      {src ? <p className="c-src">{src}</p> : null}
      {cur.kind === "choice" ? <div className="c-opts" role="radiogroup">{(cur.opts ?? []).map((o, i) => { const cls = st.checked ? (i === cur.answer ? "ok" : i === st.choice ? "no" : "") : "";
        return <button key={i} role="radio" aria-checked={st.choice === i} className={cls} disabled={st.checked} onClick={() => check({ ...st, choice: i, offer: false })}><span className="o"></span>{o}</button>; })}</div>
        : cur.kind === "tap" ? <p className="c-hint">{st.checked ? "" : <>차트에서 날짜를 눌러 고르세요. 다시 누르면 취소돼요. <b>{st.sel.length}/{need}개</b> 고름</>}</p>
        : <p className="c-hint">{st.checked ? "" : "차트에서 가격대를 누르세요. 다시 누르면 바뀌어요."}</p>}
      {st.hint && cur.hints.length ? <div className="c-hints">{cur.hints.slice(0, st.hint).map((h, i) => <p key={i}><b>힌트 {i + 1}</b><span>{h}</span></p>)}</div> : null}
      {st.checked ? <div className={`c-result ${ok ? "ok" : "no"}`}><b>{ok ? "정답" : "오답"}</b><p>{cur.explanation}</p></div> : null}
      {st.offer ? <div className="c-offer"><p>오답입니다. 힌트를 보시겠습니까?</p><div><button className="btn ghost" onClick={() => setSt({ ...st, offer: false, checked: true })}>정답 보기</button><button className="btn primary" onClick={() => setSt(fresh(Math.min(2, st.hint + 1)))}><Ic name="spark" />힌트 보기 ({st.hint + 1}/2)</button></div></div> : null}
      <div className="c-actions" hidden={st.offer}>
        {cur.hints.length && !st.checked && st.hint < 2 ? <button className="btn ghost lg c-hintbtn" onClick={() => setSt({ ...st, hint: Math.min(2, st.hint + 1) })}><Ic name="spark" />{st.hint ? "힌트 하나 더 (2/2)" : "힌트 보기 (1/2)"}</button> : null}
        {!st.checked ? (cur.kind === "choice" ? null : <button className="btn primary lg" aria-disabled={ready ? undefined : "true"} data-tip={ready ? undefined : "답을 먼저 골라 주세요."} onClick={() => { if (ready) check(st); }}>정답 확인</button>)
          : <>{ok ? null : <button className="btn outline lg" onClick={() => setSt(fresh(st.hint))}>다시 하기</button>}
            {next ? <Link className="btn primary lg" to={`/course?q=${next.id}${qs}`}>다음</Link> : topic ? <Link className="btn primary lg" to="/course">전체 코스 보기</Link> : <Link className="btn primary lg" to="/">코스 마치기</Link>}</>}
      </div>
    </section>
  </div>;
}
