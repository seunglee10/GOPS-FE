/* 종목 화면. 목업 gops.js pageStock(2029).
   - 차트·호가 탭 기본: 패널 보드 (boardPage 1958)
   - 차트 크게 보기(?view=chart): 왼쪽 큰 차트 + 오른쪽 칸(주문·요약·AI 분석, ?rp=)
   - 종목 정보(?tab=company)·뉴스·공시(?tab=news)·비교(?tab=compare)
   - ?pop=1 지지선 팝오버(차트 모듈), ?term= 용어 카드 */
import { useCallback, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useActions, type Actions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { krw, pct, tone, useFormat } from "../../app/format";
import { prefs } from "../../app/store";
import { useCompare, useFundamentals } from "../../data/hooks";
import { BoardPage } from "./Board";
import { StockHead } from "./StockHead";
import { StockChart } from "./StockChart";
import { AiPanels, SideBrief } from "./ai";
import { NewsItems, OrderInline } from "./panels";
import { TermCard } from "./TermCard";
import { OI_DEFAULT, REFS_DEFAULT, StockUiContext, ddayOf, mdw, useStockData, type OI, type Refs, type StockData, type StockUi } from "./data";

const TABS: [string, string][] = [["chart", "차트·호가"], ["company", "종목 정보"], ["news", "뉴스·공시"], ["compare", "비교"]];

export default function StockPage() {
  usePage("stock");
  const act = useActions("stock");
  const syms = useSymbolMap();
  const raw = (act.q("s") || "NVDA").toUpperCase();
  /* 목업 curSym(): 모르는 종목이면 NVDA */
  const s = Object.keys(syms).length && !syms[raw] ? "NVDA" : raw;
  const D = useStockData(s);
  const [refs, setRefs] = useState<Refs>(REFS_DEFAULT);
  const [oi, setOiState] = useState<OI>(OI_DEFAULT);
  const [flash, setFlash] = useState(0);
  const setOi = useCallback((patch: Partial<OI>) => setOiState(o => ({ ...o, ...patch })), []);
  const bumpFlash = useCallback(() => setFlash(f => f + 1), []);
  const ui = useMemo<StockUi>(() => ({ refs, setRefs, oi, setOi, flash, bumpFlash }), [refs, oi, setOi, flash, bumpFlash]);
  const term = act.q("term");
  return <StockUiContext.Provider value={ui}>
    {D.summary ? <StockBody D={D} act={act} /> : D.error ? <section className="panel"><div className="state" style={{ minHeight: 320 }}><h3>종목 정보를 불러오지 못했어요</h3><p>잠시 뒤 다시 열어 주세요.</p></div></section> : null}
    {term && D.summary ? <TermCard D={D} termKey={term} onClose={() => act.setQ({ term: null })} /> : null}
  </StockUiContext.Provider>;
}

function StockBody({ D, act }: { D: StockData; act: Actions }) {
  const s = D.s, tab = act.q("tab") || "chart";
  const bigView = tab === "chart" && act.q("view") === "chart";
  /* 오른쪽 칸 탭. 크게 보기에서는 차트를 보다가 바로 주문할 수 있게 주문을 맨 앞(기본)에 둔다 */
  const sideTabs: [string, string][] = bigView ? [["order", "주문"], ["info", "요약"], ["ai", "AI 분석"]] : [["ai", "AI 분석"], ["info", "요약"]];
  const rp = sideTabs.some(([k]) => k === act.q("rp")) ? act.q("rp")! : sideTabs[0][0];
  const ag = act.ag();
  const tabNav = (withAgent: boolean) => <nav className="tabs" role="tablist">{TABS.map(([k, t]) => <Link key={k} role="tab" to={`/stock?s=${s}${k === "chart" ? "" : "&tab=" + k}${withAgent && ag ? "&agent=" + ag : ""}`} aria-selected={tab === k}>{t}</Link>)}</nav>;
  const head = <StockHead D={D} act={act} />;
  if (tab === "chart" && !bigView) return <BoardPage D={D} act={act} head={head} tabs={tabNav(false)} />;
  let main: React.ReactNode;
  if (tab === "chart") main = <section className="panel cx-panel"><StockChart D={D} act={act} board={false} /></section>;
  else if (tab === "company") main = <CompanyTab D={D} />;
  else if (tab === "news") main = <section className="panel"><div className="panel-head"><span className="t-label">{s} 뉴스</span><span className="spacer"></span><div className="seg"><button aria-pressed="true">전체</button><button aria-pressed="false">가격에 영향 큼</button></div></div><div className="panel-body fill news">
      <NewsItems s={s} n={8} /></div></section>;
  else main = <CompareTab D={D} />;
  return <div className="stock3 nolist"><div className="stock-main">
    {head}
    {bigView ? <div className="sb-tabs"><button className="btn sm ghost sb-back" onClick={() => act.set("view", "")}><Ic name="chevR" />기본 화면으로</button><span className="t-caption">차트 크게 보기</span></div>
      : <div className="sb-tabs">{tabNav(true)}</div>}
    <SideGrid>
      {main}
      <div className="stock-side">
        <div className="seg block" role="group" aria-label="오른쪽에 볼 내용">{sideTabs.map(([k, t], i) => <button key={k} aria-pressed={rp === k} onClick={() => act.set("rp", i ? k : "")}>{t}</button>)}</div>
        {rp === "order" ? <section className="panel"><div className="panel-body"><OrderInline D={D} act={act} /></div></section> : rp === "ai" ? <AiPanels D={D} act={act} /> : <SideBrief D={D} withChart={tab === "chart"} />}
      </div>
    </SideGrid>
  </div></div>;
}

/* 오른쪽 칸 너비. 가운데 경계선을 끌어 바꾸고 브라우저(gops.side.w)에 기억한다. 창이 좁아져도 오른쪽 칸은 화면 절반을 넘지 않는다 (목업 2010~2028) */
const SIDE_MIN = 280, MAIN_MIN = 480;
const sideCols = (w: number) => `minmax(0,1fr) var(--gutter) min(${w}px, 50%)`;
function SideGrid({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  const [w, setW] = useState(() => { const v = prefs.sideW.get(); return v >= SIDE_MIN ? v : 320; });
  const grid = useRef<HTMLDivElement>(null);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const g = grid.current; if (!g) return;
    e.preventDefault();
    const sp = e.currentTarget, x0 = e.clientX, w0 = g.querySelector(".stock-side")?.getBoundingClientRect().width || w, maxW = Math.max(SIDE_MIN, g.getBoundingClientRect().width - MAIN_MIN);
    let cur = w, raf = 0;
    const apply = () => { g.style.gridTemplateColumns = sideCols(cur); raf = 0; };
    sp.classList.add("on"); document.body.classList.add("col-resizing");
    const move = (ev: PointerEvent) => { cur = Math.round(Math.max(SIDE_MIN, Math.min(maxW, w0 - (ev.clientX - x0)))); if (!raf) raf = requestAnimationFrame(apply); };
    const up = () => {
      document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up);
      if (raf) cancelAnimationFrame(raf); apply();
      sp.classList.remove("on"); document.body.classList.remove("col-resizing");
      prefs.sideW.set(cur); setW(cur);
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  };
  return <div className="grid stock" id="stockgrid" ref={grid} style={{ gridTemplateColumns: sideCols(w), columnGap: 0, flex: 1, minHeight: 520 }}>
    {children[0]}
    <div className="split split-v" onPointerDown={onDown} role="separator" aria-orientation="vertical" aria-label="오른쪽 칸 너비 조절" title="끌어서 크기 바꾸기"><i></i></div>
    {children[1]}
  </div>;
}

/* ---------- 종목 정보: 종목을 고를 때 보는 숫자. 차트 옆 '요약'에는 두지 않는다 ---------- */
const quarterLabel = (p: string, est?: boolean) => { const m = /^(\d{4})Q(\d)$/.exec(p); return (m ? `${m[2]}Q${m[1].slice(2)}` : p) + (est ? " 예상" : ""); };
function CompanyTab({ D }: { D: StockData }) {
  const fmt = useFormat(D.fx), F = D.F;
  const fund = useFundamentals(D.s);
  const price = D.summary?.price ?? D.p;
  const rev = (fund.data?.items ?? []).filter(x => x.revenue != null);
  const prof = fund.data?.profitability ?? [];
  const pf = (v: number | null) => v == null ? "-" : `${v.toFixed(1)}%`;
  return <div className="main-stack"><section className="panel"><div className="panel-head"><span className="t-label">핵심 지표</span></div><div className="panel-body"><div className="statgrid cols4">
      <div><small>시가총액</small><b>{F ? fmt.bigMoney(F.capB) : "-"}</b>{fmt.krwMode || !F ? null : <span className="s" style={{ display: "block" }}>{krw(F.capB * D.fx / 1000)}조</span>}</div>
      <div><small>PER (선행)</small><b>{F ? `${F.per.toFixed(1)}배` : "-"}</b>{F ? <span className="s" style={{ display: "block" }}>섹터 {F.sper.toFixed(1)}배</span> : null}</div>
      <div><small>52주 범위</small><b>{F ? `${fmt.usd(F.lo, 1)} ~ ${fmt.usd(F.hi, 1)}` : "-"}</b>{F ? <span className="s" style={{ display: "block" }}>고점 대비 {pct((price / F.hi - 1) * 100)}</span> : null}</div>
      <div><small>다음 실적</small><b>{D.nextEarn ? mdw(D.nextEarn) : "-"}</b>{D.nextEarn ? <span className="s" style={{ display: "block" }}>D-{ddayOf(D.nextEarn, D.asOf)}</span> : null}</div>
    </div></div></section>
    <section className="panel"><div className="panel-head"><span className="t-label">분기 매출</span><span className="t-caption">단위 10억 달러, 마지막은 컨센서스</span></div>
      {rev.length ? <div className="panel-body" style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 260 }}>{rev.map(x => { const v = x.revenue! / 1e9;
        return <div key={x.period} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><b>{String(Math.round(v * 10) / 10)}</b><i style={{ display: "block", width: "100%", height: v * 5.6, background: x.estimate ? "transparent" : "var(--brand)", ...(x.estimate ? { border: "1.5px dashed var(--brand)" } : {}), borderRadius: "var(--radius-xs) var(--radius-xs) 0 0" }}></i><span className="t-caption">{quarterLabel(x.period, x.estimate)}</span></div>; })}</div>
        : <div className="panel-body"><div className="state" style={{ minHeight: 200 }}><p>{fund.loading ? "" : "분기 매출 정보가 아직 없어요."}</p></div></div>}
      {prof.length ? <div className="panel-body"><table className="table"><thead><tr><th>수익성</th><th className="r">{D.s}</th><th className="r">섹터 중앙값</th></tr></thead><tbody>
        {prof.map(r => <tr key={r.labelKo}><td>{r.labelKo}</td><td className="r">{pf(r.value)}</td><td className="r muted">{pf(r.sectorMedian)}</td></tr>)}</tbody></table></div> : null}</section></div>;
}

/* ---------- 비교: 같은 업종 회사와 한 표로 ---------- */
function CompareTab({ D }: { D: StockData }) {
  const syms = useSymbolMap();
  const list = useMemo(() => [D.s, ...(D.summary?.peers ?? []).map(p => p.symbol).filter(k => k !== D.s)].slice(0, 3), [D.s, D.summary]);
  const cmp = useCompare(list);
  const items = cmp.data?.items ?? [];
  const num = (v: number | null, unit: string) => v == null ? "-" : `${v}${unit}`;
  return <section className="panel"><div className="panel-head"><span className="t-label">비교</span>{list.map(k => <span key={k} className="tag">{k}</span>)}<button className="btn sm ghost"><Ic name="plus" />종목 추가</button></div>
    <div className="panel-body"><table className="table"><thead><tr><th>종목</th><th className="r">오늘</th><th className="r">3개월</th><th className="r">PER</th><th className="r">영업이익률</th><th className="r">거래량/평균</th></tr></thead><tbody>
      {items.map(it => <tr key={it.symbol}><td><div className="sym"><Mark symbol={it.symbol} color={syms[it.symbol]?.color} /><b>{it.symbol}</b></div></td><td className={`r ${tone(it.changePercent)}`}>{pct(it.changePercent)}</td>
        <td className={`r ${it.return3mPercent == null ? "" : tone(it.return3mPercent)}`}>{it.return3mPercent == null ? "-" : `${it.return3mPercent > 0 ? "+" : ""}${it.return3mPercent}%`}</td><td className="r">{num(it.per, "배")}</td><td className="r">{num(it.operatingMarginPercent, "%")}</td><td className="r">{num(it.volumeRatio20d, "배")}</td></tr>)}
    </tbody></table></div></section>;
}
