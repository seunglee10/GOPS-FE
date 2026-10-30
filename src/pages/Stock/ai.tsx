/* AI 분석 패널(목업 aiPanels 1114, aiSummary 1092)과 크게 보기 오른쪽 '요약'(sideBrief 1027).
   사도 되는지 정해 주지 않는다. 결정에 필요한 사실만 모으고, 앞으로의 가격은 숫자로도 그림으로도 내지 않는다 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../app/icons";
import { RichText } from "../../app/RichText";
import { pct, tone, useFormat } from "../../app/format";
import type { Actions } from "../../app/shell/actions";
import { REF_LOOK, monthLine } from "../../charts";
import { useAiSummary, useNews } from "../../data/hooks";
import { hlTopic } from "../../app/shell/learn/topics";
import { ddayOf, mdw, swingOf, useStockUi, type RefKey, type StockData } from "./data";

const Fig = ({ k, v, cls = "" }: { k: string; v: React.ReactNode; cls?: string }) => <div><small>{k}</small><b className={cls}>{v}</b></div>;
const Figs = ({ children }: { children: React.ReactNode }) => <div className="aq-figs">{children}</div>;
/* 이 종목 보는 순서 (목업 GUIDE 1682) */
const GUIDE = [{ q: "오늘 움직임", topic: "chg vol" }, { q: "1년 중 위치", topic: "range" }, { q: "이익 대비 가격", topic: "per" }];

function AiSummaryBlock({ D, act }: { D: StockData; act: Actions }) {
  const sum = useAiSummary(D.s), news = useNews({});
  const src = useMemo(() => Object.fromEntries((news.data?.items ?? []).map(n => [n.id, n])), [news.data]);
  const A = sum.data; if (!A) return null;
  const List = ({ rows }: { rows: typeof A.news }) => <ul className="ai-pts">{rows.map((r, i) => <li key={i}><p><RichText text={r.text} /></p>{r.newsId && src[r.newsId] ? <Link className="ai-src" to={`/news?n=${encodeURIComponent(r.newsId)}`}>{src[r.newsId].source} · {src[r.newsId].relativeKo}</Link> : null}</li>)}</ul>;
  return <div className="ai-sum">
    <div className="ai-sum-h"><Ic name="spark" /><b>AI 요약</b><small>{A.meta}</small></div>
    <p className="ai-head"><RichText text={A.head} /></p>
    {A.news.length ? <><h4>무슨 일이 있었나</h4><List rows={A.news} /></> : null}
    {A.risks.length ? <><h4>걸려 있는 문제</h4><List rows={A.risks} /></> : null}
    <h4>다가올 일정</h4><ul className="ai-cal">{A.events.map((e, i) => <li key={i}><time>{e.at}</time><span>{e.title}{e.note ? <small>{e.note}</small> : null}</span><small>D-{e.dday}</small></li>)}</ul>
    <div className="aq-more"><Link className="linkbtn" to={`/stock?s=${D.s}&tab=news`}>뉴스·공시 전체 <Ic name="chevR" /></Link><button className="linkbtn" onClick={act.openAi}>AI에게 더 묻기 <Ic name="chevR" /></button></div>
  </div>;
}

export function AiPanels({ D, act }: { D: StockData; act: Actions }) {
  const fmt = useFormat(D.fx);
  const { F, C, p } = D;
  if (!F || C.length < 23) return <section className="panel ai"><div className="panel-body"><AiSummaryBlock D={D} act={act} /></div></section>;
  const sw = swingOf(C), chg = (p / D.pc - 1) * 100, perGap = (F.per / F.sper - 1) * 100;
  const pos = Math.max(0, Math.min(100, (p - F.lo) / (F.hi - F.lo || 1) * 100));
  const a = Math.min(sw.worst, -sw.typical, -1), b = Math.max(sw.best, sw.typical, 1), x = (v: number) => (v - a) / (b - a) * 100;
  const sup = D.levels?.sup, res = D.levels?.res;
  /* 칸에 마우스를 올리면 화면에서 그 숫자가 나온 곳을 표시하고, 벗어나면 사이드바에서 열어 둔 용어로 돌린다 (목업 3524~3528) */
  const back = () => hlTopic(act.dw() === "learn" ? act.q("lterm") : null);
  const Sec = ({ i, children }: { i: number; children: React.ReactNode }) => <div className="aq-q" data-hl={GUIDE[i].topic} onMouseEnter={() => hlTopic(GUIDE[i].topic)} onMouseLeave={back}><h3>{GUIDE[i].q}</h3>{children}</div>;
  return <section className="panel ai"><div className="panel-body">
    <AiSummaryBlock D={D} act={act} />
    <Sec i={0}><Figs><Fig k="어제보다" v={<span data-live="chg">{pct(chg)}</span>} cls={tone(chg)} /><Fig k="거래량" v={`${F.x.toFixed(1)}배`} /><Fig k={`${D.secName} 업종`} v={pct(D.secAvg)} cls={tone(D.secAvg)} /></Figs>
      <Figs><Fig k="한 달" v={pct(sw.month)} cls={tone(sw.month)} /><Fig k="한 달 전" v={fmt.usd(sw.monthAgo)} /><div className="aq-spark" dangerouslySetInnerHTML={{ __html: monthLine(C) }} /></Figs></Sec>
    <Sec i={1}><div className="aq-range" role="img" aria-label={`52주 저점 ${fmt.usd(F.lo)}, 고점 ${fmt.usd(F.hi)}, 지금 ${fmt.usd(p)}`}><i style={{ width: `${pos}%` }}></i><b style={{ left: `${pos}%` }}></b></div>
      <Figs><Fig k="52주 저점" v={fmt.usd(F.lo)} /><Fig k="52주 고점" v={fmt.usd(F.hi)} /><Fig k="고점 대비" v={pct((p / F.hi - 1) * 100)} /></Figs></Sec>
    <Sec i={2}><Figs><Fig k="PER (선행)" v={`${F.per.toFixed(1)}배`} /><Fig k="업종 평균" v={`${F.sper.toFixed(1)}배`} /><Fig k="차이" v={`${perGap >= 0 ? "+" : ""}${perGap.toFixed(0)}%`} /></Figs></Sec>
    <div className="aq-q"><h3>한 달 변동 폭</h3>
      <p className="aq-line">{sw.worst < 0 ? <>지난 4달 중 가장 나쁜 달엔 100만{" "}원이 <b>{Math.abs(sw.worst).toFixed(1)}만{" "}원</b> 줄었어요.</> : "지난 4달 동안 한 달 단위로 내린 적은 없어요."}</p>
      <div className="aq-swing" role="img" aria-label={`한 달 변동 폭 ${pct(sw.worst)}부터 ${pct(sw.best)}까지, 보통 ±${sw.typical.toFixed(1)}%`}><i style={{ left: `${x(-sw.typical)}%`, width: `${x(sw.typical) - x(-sw.typical)}%` }}></i><b style={{ left: `${x(0)}%` }}></b></div>
      <Figs><Fig k="가장 나쁜 달" v={pct(sw.worst)} cls={tone(sw.worst)} /><Fig k="보통" v={`±${sw.typical.toFixed(1)}%`} /><Fig k="가장 좋은 달" v={pct(sw.best)} cls={tone(sw.best)} /></Figs>
    </div>
    <div className="aq-q"><h3>가격 알림</h3>
      {sup != null && res != null ? <div className="aq-acts">
        <button className="btn sm outline" onClick={() => act.rule({ s: D.s, price: sup.toFixed(2), dir: "below" })}><Ic name="bell" />지지선 {fmt.usd(sup)} 아래로 가면</button>
        <button className="btn sm outline" onClick={() => act.rule({ s: D.s, price: res.toFixed(2), dir: "above" })}><Ic name="bell" />저항선 {fmt.usd(res)} 위로 가면</button>
      </div> : null}
      <div className="aq-more"><button className="linkbtn" onClick={() => act.rule({ s: D.s })}>직접 가격 정하기 <Ic name="chevR" /></button></div>
    </div>
  </div></section>;
}

/* ---------- 크게 보기 오른쪽 '요약': 내 손익 → 오늘 움직인 이유 → 가격 기준선 → 다음 실적 ---------- */
export function SideBrief({ D, withChart }: { D: StockData; withChart: boolean }) {
  const fmt = useFormat(D.fx);
  const ui = useStockUi();
  const { F, p, holding: h } = D;
  if (!F) return null;
  const sameDir = Math.sign(D.d) === Math.sign(D.secAvg);
  const why1 = D.why ?? (sameDir ? `뚜렷한 뉴스 없이 ${D.secName} 업종과 같은 방향` : `뚜렷한 뉴스 없이 ${D.secName} 업종과 반대 방향`);
  const refs: { k: RefKey | "now"; label: string; p: number }[] = [{ k: "hi52", label: "52주 고점", p: F.hi }, ...(D.levels ? [{ k: "res" as const, label: "저항선", p: D.levels.res }] : []),
    ...(h ? [{ k: "avg" as const, label: "내 평단", p: h.avgPrice }] : []), ...(D.levels ? [{ k: "sup" as const, label: "지지선", p: D.levels.sup }] : []), { k: "lo52", label: "52주 저점", p: F.lo }, { k: "now", label: "지금", p }];
  refs.sort((a, b) => b.p - a.p);
  const toggle = (k: RefKey) => ui.setRefs({ ...ui.refs, [k]: !ui.refs[k] });
  return <>
    {h ? <section className="panel"><div className="panel-head"><span className="t-label">내 종목</span></div><div className="panel-body"><div className="statgrid">
      <div><small>평가 손익</small><b className={tone(p / h.avgPrice - 1)}>{fmt.usd((p - h.avgPrice) * h.qty)}</b><span className="s" style={{ display: "block" }}>{pct((p / h.avgPrice - 1) * 100)}</span></div>
      <div><small>평단 · 수량</small><b>{fmt.usd(h.avgPrice)}</b><span className="s" style={{ display: "block" }}>{h.qty}주</span></div></div></div></section> : null}
    <section className="panel"><div className="panel-head"><span className="t-label">오늘 움직인 이유</span></div><div className="panel-body">
      <p className="brief-why"><span className="brief-ai"><Ic name="spark" />AI 요약</span><b>{why1}</b></p>
      <div className="brief-figs"><span>어제보다 <b className={tone(D.d)}>{pct(D.d)}</b></span><span>{D.secName} 업종 <b className={tone(D.secAvg)}>{pct(D.secAvg)}</b></span><span>거래량 평소의 <b>{F.x.toFixed(1)}배</b></span></div>
      <Link className="linkbtn" to={`/stock?s=${D.s}&tab=news`}>뉴스·공시 보기 <Ic name="chevR" /></Link></div></section>
    <section className="panel"><div className="panel-head"><span className="t-label">가격 기준선</span>{withChart ? <><span className="spacer"></span><span className="t-caption">눌러서 차트에 켜고 끄기</span></> : null}</div>
      <div className="panel-body"><ul className="ref-ladder">{refs.map(r => {
        if (r.k === "now") return <li key="now" className="ref-now"><i></i><span>지금</span><b>{fmt.usd(p)}</b><small></small></li>;
        const k = r.k, [c, dash] = REF_LOOK[k], on = withChart && ui.refs[k], gap = (r.p / p - 1) * 100;
        const inner = <><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke={c} strokeWidth="2" strokeDasharray={dash || undefined} opacity={withChart && !on ? .3 : 1} /></svg><span>{r.label}</span><b>{fmt.usd(r.p)}</b><small className={tone(gap)}>{pct(gap)}</small></>;
        return <li key={k}>{withChart ? <button onClick={() => toggle(k)} aria-pressed={on} aria-label={`${r.label} 차트에 ${on ? "끄기" : "켜기"}`}>{inner}</button> : inner}</li>;
      })}</ul></div></section>
    {D.nextEarn ? <section className="panel"><div className="panel-body brief-next"><span className="t-label">다음 실적</span><span>{mdw(D.nextEarn)}</span><span className="tag">D-{ddayOf(D.nextEarn, D.asOf)}</span></div></section> : null}
  </>;
}
