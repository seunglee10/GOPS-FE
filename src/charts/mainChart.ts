/* 종목 차트. 목업 gops.js의 drawChart/cxRenderUI/cxDrawPlot/cxHover/cxEventPop 과 마우스 처리(2242~2860)를
   컨테이너에 마운트하는 꼴로 옮겼다. 전역 상태(G.cur, q(), store, CHS.sym 등)는 전부 props·콜백으로 받는다.
   SVG 구조와 class 이름은 목업과 같아서 gops.css 가 그대로 입는다 */
import { esc, fixOf, md, mdw, money, niceStep, p2, pct, shares, tone } from "./format";
import { CX_IV, CX_MIN, isIntra, plotBars, sma, weekKey } from "./indicators";
import { supportTouches } from "./termFigures";
import type { Bar, ChartEvent, ChartSettings, ChartType, Currency, DrawPoint, Drawing, Interval, Levels, PaneKey, PlotBar, RefLine, RefLineKey, ToolKey, UpcomingEvent } from "./types";

export const CX_TYPES: [ChartType, string][] = [["candle", "캔들"], ["hollow", "속 빈 캔들"], ["bar", "바 (OHLC)"], ["line", "라인"], ["area", "영역"], ["heikin", "하이킨아시"], ["renko", "렌코"], ["kagi", "카기"]];
export const CX_PANES: [PaneKey, string][] = [["vol", "거래량"], ["short", "공매도 거래량"], ["retail", "개인 순매수"], ["inst", "기관 순매수"], ["foreign", "외국인 순매수"]];
export const CX_MA_COL = ["#12a150", "#e8344e", "#ff7a3d", "#8b5cf6"];
export const CX_TOOLS: [ToolKey, string][] = [["trend", "추세선: 두 점을 이어 흐름 보기"], ["hline", "수평선: 특정 가격에 선"], ["vline", "수직선: 특정 날짜·시간에 선"], ["rect", "사각형: 관심 가격 구간"], ["ellipse", "도형: 특정 영역 강조"], ["measure", "측정: 가격 차이와 기간"]];
/** candlesOf 거래량 1 = 100만 주 */
export const VOL_K = 1e6;
const CX_IC: Record<string, string> = {
  trend: '<path d="M4 18 20 6"/><circle cx="4" cy="18" r="1.8"/><circle cx="20" cy="6" r="1.8"/>',
  hline: '<path d="M3 12h18"/><circle cx="12" cy="12" r="1.8"/>',
  vline: '<path d="M12 3v18"/><circle cx="12" cy="12" r="1.8"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
  measure: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2m1-5 2 2m1-5 2 2"/>',
  magnet: '<path d="M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0z"/><path d="M5 8h4m6 0h4"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  sliders: '<path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  chev: '<path d="m7 10 5 5 5-5"/>',
};
const cxIc = (k: string, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CX_IC[k]}</svg>`;
/* 목업 ic 중 차트가 쓰는 것 */
const ic = {
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2"><path d="M5 12.5 10 17 19 7"/></svg>',
  expand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
  chevR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  cart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/></svg>',
  spark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg>',
};
/** 가격 기준선 모양: [색, 점선] */
export const REF_LOOK: Record<RefLineKey | "res" | "sup", [string, string]> = { hi52: ["var(--ink-muted)", "2 3"], lo52: ["var(--ink-muted)", "2 3"], avg: ["var(--ink)", "6 3"], res: ["var(--purple)", "6 4"], sup: ["var(--yellow)", ""] };

export type MainChartProps = {
  /** 티커. aria-label 과 콜백 payload 에 쓴다 */
  sym?: string;
  /** settings.iv 주기의 막대. 하이킨아시·렌코·카기 변환은 안에서 한다 */
  bars: Bar[];
  /** 일봉. 시간축 표시 팝오버의 등락·거래량, 에이전트 근거의 거래량 배수, 지지선 팝오버에 쓴다. 없으면 iv가 D일 때 bars 를 쓴다 */
  daily?: Bar[];
  /** 현재가 (실시간이면 그 값) */
  cur: number;
  settings: ChartSettings;
  drawings: Drawing[];
  /** 최근 순(내림차순). 번호가 팝오버 선택 키라서 순서를 지켜 넘긴다 */
  events: ChartEvent[];
  /** 다가올 일정. earn 이 다음 실적 발표 */
  upcoming?: UpcomingEvent[];
  /** D-day 기준 날짜. 기본은 오늘 */
  today?: Date;
  levels: Levels | null;
  /** 사이드바에서 켠 기준선(52주 고점·저점·내 평단). 켜진 것만 */
  refLines: RefLine[];
  /** 환율 (달러 → 원) */
  fx: number;
  cur$: Currency;
  /** 에이전트 근거 표시 (목업 ?hl=1) */
  hl?: boolean;
  /** 보드 안(작게) 보기. true면 '차트 크게 보기' 버튼이 보인다 (목업 view !== "chart") */
  board?: boolean;
  /** 지지선 팝오버 열림 (목업 ?pop=1) */
  pop?: boolean;
  /** 지지선 실전 차트 개수 (팝오버 작은 글씨) */
  supCourses?: number;
  /** 용어 풀이에서 가리키는 화면 위치 ("candle" | "vol" | "sup") */
  topicHl?: string[];
  /** 도구 막대 오른쪽 상태 글. 기본 "실시간, 09:42:10 ET" */
  liveLabel?: string;
  onSettings(next: ChartSettings): void;
  onDrawings(next: Drawing[]): void;
  /** 차트 안 data-act 버튼: "set"(k: view|hl), "pop", "rule-res", "rule", "order", "ask-level", "go", "news", "toast" */
  onAction(act: string, payload?: Record<string, string>): void;
};

export type MainChartHandle = { update(props: MainChartProps): void; destroy(): void };

type Pane = { k: PaneKey; top: number; bot: number; mid: number; sc: number; signed: boolean; name: string; daily: boolean };
type Geo = {
  W: number; H: number; L: number; R: number; T: number; XA: number; mainB: number; plotW: number; step: number;
  x(i: number): number; y(p: number): number; yInv(py: number): number; fiAt(mx: number): number;
  lo: number; hi: number; n: number; i0: number; i1: number; bars: PlotBar[]; panes: Pane[]; cur: number;
  maVals: (number | null)[][]; volMa?: (number | null)[]; evPos: Record<string, number[]>;
};
type Drag =
  | { k: "ys"; y0: number; lo: number; hi: number }
  | { k: "xs"; x0: number; c0: number }
  | { k: "draft"; x0: number; y0: number; moved: boolean }
  | { k: "dh"; id: string; w: "a" | "b" }
  | { k: "dmove"; id: string; x0: number; y0: number; a: DrawPoint; b: DrawPoint | null }
  | { k: "pan"; x0: number; y0: number; e0: number; lock: { lo: number; hi: number } | null; moved: boolean };

const cloneSettings = (s: ChartSettings): ChartSettings => ({ ...s, ma: [...s.ma], maOn: [...s.maOn], panes: [...s.panes] });
const cloneDraw = (d: Drawing): Drawing => ({ ...d, a: { ...d.a }, b: d.b ? { ...d.b } : undefined });

/* 시간 ↔ 막대 번호. 마지막 막대 뒤(오른쪽 빈칸)는 최근 간격으로 늘려 계산한다 */
function idxAt(G: Geo, t: number) {
  const B = G.bars, n = B.length; if (!n) return 0;
  const T = (i: number) => B[i].t.getTime(), dt = (T(n - 1) - T(Math.max(0, n - 21))) / Math.max(1, Math.min(20, n - 1)) || 864e5;
  if (t >= T(n - 1)) return n - 1 + (t - T(n - 1)) / dt;
  if (t <= T(0)) return (t - T(0)) / dt;
  let a = 0, b = n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (T(m) <= t) a = m; else b = m; }
  return a + (t - T(a)) / ((T(b) - T(a)) || 1);
}
function timeAt(G: Geo, fi: number) {
  const B = G.bars, n = B.length, T = (i: number) => B[i].t.getTime(), dt = (T(n - 1) - T(Math.max(0, n - 21))) / Math.max(1, Math.min(20, n - 1)) || 864e5;
  if (fi >= n - 1) return T(n - 1) + (fi - (n - 1)) * dt;
  if (fi <= 0) return T(0) + fi * dt;
  const a = Math.floor(fi); return T(a) + (fi - a) * (T(a + 1) - T(a));
}

/* 아래 시간 눈금: 화면에 들어온 막대 수에 맞춰 1분 ~ 5년 중 글자가 겹치지 않는 가장 촘촘한 단위를 고른다 */
const CX_UNITS: [string, (t: Date) => string | number, boolean?][] = [
  ["m1", t => t.getTime() / 6e4 | 0, true], ["m5", t => t.getTime() / 3e5 | 0, true], ["m15", t => t.getTime() / 9e5 | 0, true], ["m30", t => t.getTime() / 18e5 | 0, true],
  ["h1", t => t.toDateString() + t.getHours(), true], ["h2", t => t.toDateString() + (t.getHours() >> 1), true],
  ["day", t => t.toDateString()], ["week", weekKey], ["month", t => t.getFullYear() * 12 + t.getMonth()], ["q", t => t.getFullYear() * 4 + (t.getMonth() / 3 | 0)],
  ["half", t => t.getFullYear() * 2 + (t.getMonth() / 6 | 0)], ["year", t => t.getFullYear()], ["y2", t => t.getFullYear() >> 1], ["y5", t => t.getFullYear() / 5 | 0]];
function timeTicks(bars: PlotBar[], i0: number, i1: number, step: number, intra: boolean) {
  const span = i1 - i0 + 1;
  for (const [u, key, intraOnly] of CX_UNITS) {   // intraOnly: 분·시간 단위
    if (intraOnly && !intra) continue;
    let n = 0, prev: string | number | null = null; for (let i = i0; i <= i1; i++) { const k = key(bars[i].t); if (k !== prev) { n++; prev = k; } }
    if (span * step / Math.max(1, n) < 64) continue;   // 글자 하나에 64px은 있어야 겹치지 않는다
    const out: { i: number; txt: string; big: boolean }[] = []; prev = i0 > 0 ? key(bars[i0 - 1].t) : null;
    for (let i = i0; i <= i1; i++) {
      const t = bars[i].t, k = key(t); if (k === prev) continue; prev = k;
      const pt = i > 0 ? bars[i - 1].t : null;
      const newDay = !pt || pt.toDateString() !== t.toDateString(), newMonth = !pt || pt.getMonth() !== t.getMonth() || pt.getFullYear() !== t.getFullYear(), newYear = !pt || pt.getFullYear() !== t.getFullYear();
      let txt: string, big = false;
      if (intraOnly) { if (newDay) { txt = `${t.getMonth() + 1}/${t.getDate()}`; big = true; } else txt = `${p2(t.getHours())}:${p2(t.getMinutes())}`; }
      else if (u === "day" || u === "week") { if (newYear) { txt = `${t.getFullYear()}`; big = true; } else if (newMonth) { txt = `${t.getMonth() + 1}월`; big = true; } else txt = `${t.getDate()}`; }
      else if (u === "month" || u === "q" || u === "half") { if (newYear) { txt = `${t.getFullYear()}`; big = true; } else txt = `${t.getMonth() + 1}월`; }
      else txt = `${t.getFullYear()}`;
      out.push({ i, txt, big });
    }
    return out;
  }
  return [];
}

class MainChart {
  private box: HTMLElement;
  private props: MainChartProps;
  private S: ChartSettings;
  private draws: Drawing[];
  private end: number | null = null;
  private count = 120;
  private ylock: { lo: number; hi: number } | null = null;
  private tool: ToolKey | null = null;
  private menu: string | null = null;
  private sel: string | null = null;
  private draft: Drawing | null = null;
  private hover: { x: number; y: number } | null = null;
  private drag: Drag | null = null;
  private geo: Geo | null = null;
  private noClick = false;
  private ev: string | null = null;
  private boxSize = 0;
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private off: (() => void)[] = [];

  constructor(box: HTMLElement, props: MainChartProps) {
    this.box = box; this.props = props; this.S = cloneSettings(props.settings); this.draws = props.drawings.map(cloneDraw);
    box.classList.add("cx"); box.dataset.colors = this.S.colors;
    if (!box.querySelector(".cx-body")) box.innerHTML = `<div class="cx-bar"></div><div class="cx-body"><div class="cx-tools" role="toolbar" aria-label="그리기 도구" aria-orientation="vertical"></div>
    <div class="cx-plot"><svg class="cx-svg"></svg><div class="cx-legend" aria-live="off"></div><div class="cx-float"></div></div></div>`;
    this.bind();
    this.renderUI(); this.drawPlot();
  }

  /* ---------- 바깥에서 쓰는 것 ---------- */
  update(props: MainChartProps) {
    const prev = this.props; this.props = props;
    const reset = props.sym !== prev.sym || props.settings.iv !== this.S.iv || props.settings.type !== this.S.type;
    const dataOnly = !reset && props.settings === prev.settings && props.drawings === prev.drawings && props.events === prev.events && props.levels === prev.levels
      && props.refLines === prev.refLines && props.hl === prev.hl && props.pop === prev.pop && props.cur$ === prev.cur$ && props.fx === prev.fx && props.board === prev.board;
    this.S = cloneSettings(props.settings);
    const editing = this.drag && (this.drag.k === "dh" || this.drag.k === "dmove" || this.drag.k === "draft");
    if (!editing) this.draws = props.drawings.map(cloneDraw);
    if (reset) { this.end = null; this.sel = null; this.draft = null; this.ev = null; if (this.special()) this.tool = null; }
    this.box.dataset.colors = this.S.colors;
    this.renderUI(); this.drawPlot(dataOnly);
  }
  destroy() {
    this.off.forEach(f => f()); this.off = [];
    if (this.ro) this.ro.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    document.body.classList.remove("cx-grab");
    this.box.classList.remove("cx"); this.box.innerHTML = "";
  }

  /* ---------- 설정·그린 선 ---------- */
  private save() { this.props.onSettings(cloneSettings(this.S)); }
  private saveDraw() { this.props.onDrawings(this.draws.map(cloneDraw)); }
  private special() { return this.S.type === "renko" || this.S.type === "kagi"; }
  private intra() { return isIntra(this.S.iv); }
  private krw() { return this.props.cur$ === "krw"; }
  private K() { return this.krw() ? this.props.fx : 1; }
  private curName() { return this.krw() ? "원" : "달러"; }
  private P(v: number) { return this.krw() ? Math.round(v * this.props.fx).toLocaleString("ko-KR") : v.toFixed(2); }
  private usd(v: number) { return money(v, this.props.cur$, this.props.fx); }
  private short(t: Date) { return this.intra() ? `${t.getMonth() + 1}/${t.getDate()} ${p2(t.getHours())}:${p2(t.getMinutes())}` : `${String(t.getFullYear()).slice(2)}.${p2(t.getMonth() + 1)}.${p2(t.getDate())}`; }
  private unit() { return this.intra() ? "봉" : ({ D: "일", W: "주", M: "개월", Y: "년" } as Record<string, string>)[this.S.iv]; }
  private daily() { return this.props.daily ?? (this.S.iv === "D" ? this.props.bars : []); }
  private later() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.drawPlot(); }); }

  /* ---------- 보기 범위 ---------- */
  private resetView(n: number) {
    const def = this.special() ? 80 : this.intra() ? 120 : ({ D: 120, W: 104, M: 72, Y: 40 } as Record<string, number>)[this.S.iv];
    this.count = Math.min(def, n + 4); this.end = n - 1 + Math.max(2, Math.round(this.count * 0.03)); this.ylock = null;
  }
  private clamp(n: number) {
    this.count = Math.max(8, Math.min(Math.max(30, n * 1.1 + 5), this.count));
    this.end = Math.max(Math.min(n - 1, this.count * 0.3), Math.min(n - 1 + this.count * 0.5, this.end ?? n - 1));
  }
  /* 마우스 자리 → 그리기 점. 자석을 켜면 가장 가까운 막대의 시가·고가·저가·종가 중 가까운 값에 붙는다 */
  private point(G: Geo, mx: number, my: number, snap = this.S.magnet): DrawPoint {
    let fi = G.fiAt(mx); const i = Math.round(fi);
    let p = G.yInv(my);
    if (snap && i >= 0 && i < G.n) { const b = G.bars[i]; fi = i; p = [b.o, b.h, b.l, b.c].reduce((a, v) => Math.abs(v - p) < Math.abs(a - p) ? v : a); }
    else if (snap) fi = i;
    return { t: timeAt(G, fi), p };
  }

  /* ---------- 위쪽 도구 막대와 왼쪽 그리기 도구 ---------- */
  private menuHTML() {
    const m = this.menu, S = this.S, ck = (on: boolean, act: string, v: string | number, label: string, extra = "") => `<button class="cx-it" role="menuitemcheckbox" aria-checked="${on}" data-cx="${act}" data-v="${v}" ${extra}><span class="cx-ck">${ic.check}</span>${label}</button>`;
    if (m === "min") return `<div class="menu cx-menu keepopen" role="menu">${CX_MIN.map(k => `<button role="menuitemradio" aria-checked="${S.iv === k}" data-cx="iv" data-v="${k}">${CX_IV[k][0]}</button>`).join("")}</div>`;
    if (m === "type") return `<div class="menu cx-menu keepopen" role="menu">${CX_TYPES.map(([k, t]) => `<button role="menuitemradio" aria-checked="${S.type === k}" data-cx="type" data-v="${k}">${t}</button>`).join("")}
    <p class="cx-note">렌코·카기는 시간 대신 가격이 일정 폭(최근 14개 막대의 평균 움직임) 움직일 때마다 한 칸씩 그려요.</p></div>`;
    if (m === "ind") return `<div class="menu cx-menu cx-wide keepopen" role="menu">
    <div class="cx-mh">차트 위</div>
    ${S.ma.map((n, i) => `<div class="cx-row"><button class="cx-it" role="menuitemcheckbox" aria-checked="${S.maOn[i]}" data-cx="ma" data-v="${i}" aria-label="${n}${this.unit()} 이동평균선"><span class="cx-ck">${ic.check}</span></button>
      <i class="cx-dot" style="background:${CX_MA_COL[i]}"></i><span>이동평균</span><input type="number" min="1" max="250" value="${n}" data-cx-in="ma${i}" aria-label="이동평균 ${i + 1} 기간"><span class="muted">${this.unit()}</span></div>`).join("")}
    ${ck(S.levels, "levels", 1, "지지선·저항선")}
    ${ck(S.hilo, "hilo", 1, "보이는 구간의 최고가·최저가")}
    ${S.iv === "D" ? `<button class="cx-it" role="menuitemcheckbox" aria-checked="${!!this.props.hl}" data-act="set" data-k="hl" data-v="${this.props.hl ? "" : "1"}"><span class="cx-ck">${ic.check}</span>에이전트 근거</button>` : ""}
    <div class="cx-mh">아래 지표 <small>3개까지</small></div>
    ${CX_PANES.map(([k, t]) => k === "vol" ? `<div class="cx-row">${ck(S.panes.includes(k), "pane", k, t)}<input type="number" min="1" max="250" value="${S.volN}" data-cx-in="volN" aria-label="거래량 평균 기간"><span class="muted">${this.unit()} 평균</span></div>` : ck(S.panes.includes(k), "pane", k, t)).join("")}
    <p class="cx-note">공매도 거래량과 투자자별 순매수는 하루 단위로만 나와서 분봉에서는 비어 있어요.</p></div>`;
    if (m === "set") return `<div class="menu cx-menu cx-wide right keepopen" role="menu">
    <div class="cx-mh">캔들 색</div>
    <button role="menuitemradio" aria-checked="${S.colors === "kr"}" data-cx="colors" data-v="kr"><i class="cx-sw" style="background:#e8344e"></i><i class="cx-sw" style="background:#2f6fe4"></i>오르면 빨강, 내리면 파랑 (국내식)</button>
    <button role="menuitemradio" aria-checked="${S.colors === "us"}" data-cx="colors" data-v="us"><i class="cx-sw" style="background:#12a150"></i><i class="cx-sw" style="background:#e8344e"></i>오르면 초록, 내리면 빨강 (미국식)</button>
    <div class="cx-mh">보기</div>
    <button data-cx="reset">처음 보기 범위로</button></div>`;
    return "";
  }
  private renderUI() {
    const box = this.box, bar = box.querySelector(".cx-bar"), tools = box.querySelector(".cx-tools"); if (!bar || !tools) return;
    const S = this.S, isMin = this.intra(), board = this.props.board !== false;
    const dd = (k: string, inner: string, cls = "cx-btn", label = "") => `<span class="cx-dd"><button class="${cls}" data-cx="menu" data-v="${k}" aria-expanded="${this.menu === k}" aria-haspopup="menu" ${label ? `aria-label="${label}"` : ""}>${inner}</button>${this.menu === k ? this.menuHTML() : ""}</span>`;
    bar.innerHTML = `
    <div class="seg sm cx-iv">${dd("min", `${isMin ? CX_IV[S.iv][0] : "분"}${cxIc("chev", 13)}`, isMin ? "on" : "")}${(["D", "W", "M", "Y"] as Interval[]).map(k => `<button aria-pressed="${S.iv === k}" data-cx="iv" data-v="${k}">${CX_IV[k][0]}</button>`).join("")}</div>
    ${dd("type", `${(CX_TYPES.find(t => t[0] === S.type) ?? CX_TYPES[0])[1]}${cxIc("chev", 13)}`)}
    ${dd("ind", `지표${cxIc("chev", 13)}`)}
    <span class="spacer"></span>
    <span class="tag fresh">${esc(this.props.liveLabel ?? "실시간, 09:42:10 ET")}</span>
    ${dd("set", cxIc("sliders"), "iconbtn", "차트 설정")}
    ${board ? `<button class="iconbtn" data-act="set" data-k="view" data-v="chart" aria-label="차트 크게 보기">${ic.expand}</button>` : ""}`;
    const sp = this.special();
    tools.innerHTML = `${CX_TOOLS.map(([k, t]) => `<button class="cx-tool tip-right" data-cx="tool" data-v="${k}" aria-pressed="${this.tool === k}" aria-label="${t.split(":")[0]}" data-tip="${sp ? "렌코·카기에서는 그릴 수 없어요" : t}" ${sp ? "disabled" : ""}>${cxIc(k)}</button>`).join("")}
    <i class="cx-tsep"></i>
    <button class="cx-tool tip-right" data-cx="magnet" aria-pressed="${S.magnet}" aria-label="자석" data-tip="자석: 그리는 점을 가장 가까운 시가·고가·저가·종가에 붙여요 (${S.magnet ? "켜짐" : "꺼짐"})">${cxIc("magnet")}</button>
    <button class="cx-tool tip-right" data-cx="clear" aria-label="그린 선 모두 지우기" data-tip="그린 선 모두 지우기" ${this.draws.length ? "" : "disabled"}>${cxIc("trash")}</button>`;
    box.querySelector(".cx-plot")?.classList.toggle("drawing", !!this.tool);
  }

  /* ---------- 그리기 ---------- */
  private drawPlot(live?: boolean) {
    const box = this.box, plot = box.querySelector<HTMLElement>(".cx-plot"), svg = box.querySelector<SVGSVGElement>(".cx-svg"), float = box.querySelector(".cx-float"); if (!plot || !svg || !float) return;
    if (live && (this.menu || this.drag || this.props.pop)) return;   // 메뉴·끌기 중엔 실시간으로 다시 그리지 않는다 (입력·클릭이 끊기지 않게)
    const { width: W, height: H } = plot.getBoundingClientRect(); if (W < 60 || H < 100) return;
    const S = this.S, s = this.props.sym ?? "", type = S.type, sp = this.special(), intra = this.intra();
    const { bars, box: boxSize } = plotBars(this.props.bars, type); this.boxSize = boxSize;
    const n = bars.length; if (!n) { svg.innerHTML = ""; float.innerHTML = ""; this.geo = null; return; }
    if (this.end == null) this.resetView(n);
    this.clamp(n);
    const end = this.end as number, count = this.count;
    // 마우스를 올리면 범례 첫 줄(시작·고가·저가·종가와 등락률)이 540px쯤 된다. 그보다 좁으면 두 줄로 넘어가니 위 여백을 한 줄 더 둔다
    const panes = sp ? [] : S.panes.slice(0, 3), L = 6, R = 66, T = W - 86 < 540 ? 58 : 40, XA = 24, PG = 8;
    const paneH = panes.length ? Math.max(46, Math.min(86, H * 0.15)) : 0, mainB = H - XA - panes.length * (paneH + PG), plotW = W - L - R;
    const step = plotW / count, x = (i: number) => L + plotW - (end - i + 0.5) * step, fiAt = (mx: number) => end + 0.5 - (L + plotW - mx) / step;
    const i0 = Math.max(0, Math.floor(end - count)), i1 = Math.min(n - 1, Math.ceil(end)), vis = bars.slice(i0, i1 + 1);
    const useC = type === "line" || type === "area";
    // 시간축 표시(실적·뉴스)는 일·주·월 봉에서만. 표시가 캔들을 가리지 않게 아래 여백을 더 둔다
    const evOn = !sp && !intra && S.iv !== "Y";
    // 사이드바에서 켠 52주 고저·내 평단은 화면 밖이어도 보이게 범위에 넣는다
    const refs = sp ? [] : this.props.refLines;
    let lo: number, hi: number;
    if (this.ylock) ({ lo, hi } = this.ylock);
    else { lo = Math.min(...vis.map(b => useC ? b.c : b.l)); hi = Math.max(...vis.map(b => useC ? b.c : b.h));
      refs.forEach(r => { lo = Math.min(lo, r.p); hi = Math.max(hi, r.p); });
      const pd = (hi - lo || hi * 0.02); hi += pd * 0.1; lo -= pd * (evOn ? 0.16 : 0.07); }
    const y = (p: number) => T + (hi - p) / (hi - lo) * (mainB - T), yInv = (py: number) => hi - (py - T) / (mainB - T) * (hi - lo);
    const G: Geo = this.geo = { W, H, L, R, T, XA, mainB, plotW, step, x, y, yInv, fiAt, lo, hi, n, i0, i1, bars, panes: [], cur: this.props.cur, maVals: [], evPos: {} };
    const up = (b: Bar) => b.c >= b.o, col = (b: Bar) => up(b) ? "var(--cx-up)" : "var(--cx-dn)";
    const bw = Math.max(1, Math.min(14, step * 0.68));
    let g = "";
    // 가격 눈금: 위아래 범위를 56px 안팎 간격으로 나누는 1·2·2.5·5 단위. 범위를 바꾸면 단위도 다시 고른다
    // 원으로 볼 때는 원 단위에서 간격을 골라야 20,000원처럼 떨어진다 (20달러를 그대로 바꾸면 27,650원)
    const k = this.K(), tick = niceStep((hi - lo) * k / Math.max(2, (mainB - T) / 56)), fx = k === 1 ? fixOf(tick) : 0;
    const fmt = (v: number) => k === 1 ? v.toFixed(fx) : Math.round(v).toLocaleString("ko-KR");
    for (let p = Math.ceil(lo * k / tick) * tick; p <= hi * k; p += tick) {
      const py = y(p / k); if (py < T - 2 || py > mainB) continue;
      g += `<line x1="${L}" x2="${W - R}" y1="${py}" y2="${py}" stroke="var(--chart-grid)"/><text x="${W - R + 8}" y="${py + 4}" font-size="11.5" fill="var(--chart-axis)">${fmt(p)}</text>`;
    }
    if (!this.ylock) g += `<text x="${W - 4}" y="${T - 26}" font-size="10.5" fill="var(--muted-soft)" text-anchor="end">눈금 ${fmt(tick)}${this.curName()}</text>`;
    const ticks = timeTicks(bars, i0, i1, step, intra);
    let lastX = -1e9;
    ticks.forEach(({ i, txt, big }) => { const px = x(i); if (px < L + 14 || px > W - R - (evOn ? 30 : 10) || px - lastX < 40) return; lastX = px;
      g += `<line x1="${px}" x2="${px}" y1="${T}" y2="${H - XA}" stroke="var(--chart-grid)" ${big ? "" : 'stroke-dasharray="2 4"'}/><text x="${px}" y="${H - 7}" font-size="11.5" fill="var(--chart-axis)" font-weight="${big ? 700 : 400}" text-anchor="middle">${txt}</text>`; });
    // 본 차트
    let ser = "";
    if (type === "line" || type === "area") {
      const pts = vis.map((b, k) => `${x(i0 + k).toFixed(1)},${y(b.c).toFixed(1)}`).join(" ");
      if (type === "area" && vis.length) ser += `<polygon points="${x(i0).toFixed(1)},${mainB} ${pts} ${x(i1).toFixed(1)},${mainB}" fill="var(--brand)" fill-opacity=".1"/>`;
      ser += `<polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="1.8" stroke-linejoin="round"/>`;
    } else if (type === "kagi") {
      vis.forEach((b, k) => { const i = i0 + k, c = b.up ? "var(--cx-up)" : "var(--cx-dn)", w = b.yang ? 2.6 : 1.1;
        ser += `<line x1="${x(i)}" x2="${x(i)}" y1="${y(b.o)}" y2="${y(b.c)}" stroke="${c}" stroke-width="${w}"/>${i < n - 1 ? `<line x1="${x(i)}" x2="${x(i + 1)}" y1="${y(b.c)}" y2="${y(b.c)}" stroke="${c}" stroke-width="${w}"/>` : ""}`; });
    } else {
      vis.forEach((b, k) => {
        const i = i0 + k, cx = x(i), c = col(b), top = y(Math.max(b.o, b.c)), bh = Math.max(1, Math.abs(y(b.o) - y(b.c)));
        if (type === "bar") ser += `<line x1="${cx}" x2="${cx}" y1="${y(b.h)}" y2="${y(b.l)}" stroke="${c}" stroke-width="1.3"/><line x1="${cx - bw / 2}" x2="${cx}" y1="${y(b.o)}" y2="${y(b.o)}" stroke="${c}" stroke-width="1.3"/><line x1="${cx}" x2="${cx + bw / 2}" y1="${y(b.c)}" y2="${y(b.c)}" stroke="${c}" stroke-width="1.3"/>`;
        else if (type === "renko") ser += `<rect x="${cx - step * 0.45}" y="${top}" width="${step * 0.9}" height="${bh}" fill="${c}" fill-opacity=".85" stroke="${c}"/>`;
        else { const hollow = type === "hollow" && up(b);
          ser += `<line x1="${cx}" x2="${cx}" y1="${y(b.h)}" y2="${y(b.l)}" stroke="${c}"/><rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${bh}" fill="${hollow ? "var(--canvas)" : c}" stroke="${c}" stroke-width="${hollow ? 1.2 : 0}"/>`; }
      });
    }
    // 이동평균선
    let ma = "";
    const maVals: (number | null)[][] = [];
    if (!sp) S.ma.forEach((p, k) => { const A = sma(bars.map(b => b.c), p); maVals.push(A); if (!S.maOn[k]) return;
      const pts: string[] = []; for (let i = Math.max(i0 - 1, 0); i <= i1; i++) { const v = A[i]; if (v != null) pts.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`); }
      if (pts.length > 1) ma += `<polyline points="${pts.join(" ")}" fill="none" stroke="${CX_MA_COL[k]}" stroke-width="1.3" stroke-linejoin="round" opacity=".9"/>`; });
    G.maVals = maVals;
    // 보이는 구간의 최고가·최저가 (지금 가격과의 차이, 그 날짜)
    let hl2 = "";
    if (S.hilo && vis.length > 2) {
      let ih = i0, il = i0; vis.forEach((b, k) => { if ((useC ? b.c : b.h) > (useC ? bars[ih].c : bars[ih].h)) ih = i0 + k; if ((useC ? b.c : b.l) < (useC ? bars[il].c : bars[il].l)) il = i0 + k; });
      const mk = (i: number, v: number, isHi: boolean) => { const px = x(i), py = y(v), left = px > L + plotW * 0.62, tx = left ? px - 10 : px + 10, ty = isHi ? Math.max(T + 10, py - 6) : Math.min(mainB - 4, py + 14);
        return `<line x1="${px}" x2="${tx + (left ? 4 : -4)}" y1="${py + (isHi ? -2 : 2)}" y2="${ty - 4}" stroke="var(--ink-muted)" stroke-width=".8"/>
        <text class="halo" x="${tx}" y="${ty}" font-size="11.5" fill="${isHi ? "var(--cx-up)" : "var(--cx-dn)"}" text-anchor="${left ? "end" : "start"}">${isHi ? "최고" : "최저"} ${this.P(v)} (${pct((v / G.cur - 1) * 100)}, ${this.short(bars[i].t)})</text>`; };
      hl2 = mk(ih, useC ? bars[ih].c : bars[ih].h, true) + (il !== ih ? mk(il, useC ? bars[il].c : bars[il].l, false) : "");
    }
    // 지지·저항선 (누르면 기존 지지선 메뉴와 규칙 만들기). 목표가·손절가는 값이 있을 때만
    const LV = this.props.levels;
    const lvl = (p: number, label: string, c: string, dash: boolean, act: string, ink = "var(--level-ink)") => { const py = y(p); if (py < T || py > mainB) return "";
      return `<g class="lvl"${act ? ` data-act="${act}" tabindex="0" role="button"` : ""} aria-label="${label} ${this.P(p)}"><line x1="${L}" x2="${W - R}" y1="${py}" y2="${py}" stroke="${c}" stroke-width="1.3" ${dash ? 'stroke-dasharray="6 4"' : ""}/>
      <line x1="${L}" x2="${W - R}" y1="${py}" y2="${py}" stroke="transparent" stroke-width="14"/><rect x="${L + 6}" y="${py - 10}" width="${label.length * 12 + 52}" height="20" rx="4" fill="${c}"/><text x="${L + 13}" y="${py + 4}" font-size="11.5" font-weight="600" fill="${ink}">${label} ${this.P(p)}</text></g>`; };
    let levels = "";
    if (LV && S.levels && !sp) {
      levels += lvl(LV.res, "저항", "var(--purple)", true, "rule-res", "#ffffff") + lvl(LV.sup, "지지", "var(--yellow)", false, "pop");
      if (LV.target1 != null) levels += lvl(LV.target1, "1차 목표", "var(--cx-up)", true, "", "#ffffff");
      if (LV.target2 != null) levels += lvl(LV.target2, "2차 목표", "var(--cx-up)", true, "", "#ffffff");
      if (LV.stop != null) levels += lvl(LV.stop, "손절", "var(--danger)", true, "", "#ffffff");
    }
    // 52주 고점·저점, 내 평단. 오른쪽 끝은 최근 캔들과 '최고·최저' 글자가 몰리는 곳이라 이름표는 왼쪽에 둔다
    const tw = (t: string) => [...t].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 11.5 : 6.6), 0);
    const refSvg = refs.map(r => { const py = y(r.p); if (py < T || py > mainB) return "";
      const [c, dash] = REF_LOOK[r.k], t = `${esc(r.label)} ${this.P(r.p)}`, w = tw(t) + 14, rx = L + 6;
      return `<g><line x1="${L}" x2="${W - R}" y1="${py}" y2="${py}" stroke="${c}" stroke-width="1.3" stroke-dasharray="${dash}"/>
      <rect x="${rx}" y="${py - 10}" width="${w}" height="20" rx="4" fill="var(--canvas)" stroke="${c}"/><text x="${rx + w / 2}" y="${py + 4}" font-size="11.5" font-weight="600" fill="${c}" text-anchor="middle">${t}</text></g>`; }).join("");
    // 시간축 표시: 지난 실적·뉴스는 그날 아래에 작은 이름표, 다음 실적은 오른쪽 아래 구석에 D-day만
    let evs = ""; G.evPos = {};
    if (evOn) {
      const list = this.props.events, placed: number[] = [], py = mainB - 13;
      list.forEach((e, j) => {
        const fi = Math.round(idxAt(G, e.t.getTime())); if (fi < i0 || fi > i1) return;
        const px = x(fi); if (px < L + 18 || px > W - R - 18 || placed.some(u => Math.abs(u - px) < 32)) return;
        placed.push(px); G.evPos[j] = [px, py, fi];
        const on = this.ev === String(j), lbl = e.k === "earn" ? "실적" : "뉴스";
        const guide = on ? `<line x1="${px}" x2="${px}" y1="${y(bars[fi].l) + 4}" y2="${py - 9}" stroke="var(--brand)" stroke-dasharray="2 2"/>` : "";
        evs += `${guide}<g class="cx-ev" data-cx="ev" data-v="${j}" role="button" tabindex="0" aria-label="${md(e.t)} ${lbl}: ${esc(e.title)}">
        <rect x="${px - 15}" y="${py - 9}" width="30" height="18" rx="9" fill="${on ? "var(--brand)" : "var(--canvas)"}" stroke="${on ? "var(--brand)" : e.k === "news" ? "var(--caution)" : "var(--hairline-strong)"}"/>
        <text x="${px}" y="${py + 4}" font-size="10.5" font-weight="600" fill="${on ? "var(--on-brand)" : "var(--ink-muted)"}" text-anchor="middle">${lbl}</text></g>`;
      });
      const next = this.nextEarn();
      if (next) { const nd = next.t, on = this.ev === "next";
        G.evPos.next = [W - R / 2, H - XA / 2];
        evs += `<g class="cx-ev" data-cx="ev" data-v="next" role="button" tabindex="0" aria-label="다음 실적 발표 ${md(nd)}, ${this.dday(nd)}일 뒤">
      <rect x="${W - R + 3}" y="${H - XA + 3}" width="${R - 6}" height="18" rx="9" fill="${on ? "var(--brand)" : "var(--canvas)"}" stroke="${on ? "var(--brand)" : "var(--hairline-strong)"}"/>
      <text x="${W - R / 2}" y="${H - XA + 16}" font-size="10.5" font-weight="600" fill="${on ? "var(--on-brand)" : "var(--ink)"}" text-anchor="middle">실적 D-${this.dday(nd)}</text></g>`; }
    }
    // 에이전트 근거: 일봉 마지막 날
    let agent = "";
    if (this.props.hl && S.iv === "D" && !sp && i1 === n - 1) { const b = bars[n - 1], hx = x(n - 1) - Math.max(step, 8) * 1.2, hw = Math.max(step, 8) * 2.4;
      agent = `<rect x="${hx}" y="${y(b.h) - 30}" width="${hw}" height="${H - XA - y(b.h) + 30}" fill="var(--caution)" fill-opacity=".1" stroke="var(--caution)" stroke-dasharray="4 3" rx="3"/>
      <g transform="translate(${hx - 4},${y(b.h) - 30})"><rect x="-122" y="0" width="122" height="22" rx="4" fill="var(--caution)"/><text x="-61" y="15" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">${md(b.t)} 거래량 ${this.volX().toFixed(1)}배</text></g>`; }
    // 현재가 선과 오른쪽 이름표
    const lastC = G.cur, ly = y(lastC);
    const now = ly >= T && ly <= mainB ? `<line x1="${L}" x2="${W - R}" y1="${ly}" y2="${ly}" stroke="var(--brand)" stroke-dasharray="2 3" opacity=".7"/><rect x="${W - R + 3}" y="${ly - 10}" width="${R - 6}" height="20" rx="4" fill="var(--brand)"/><text x="${W - R / 2}" y="${ly + 4}" font-size="11.5" font-weight="700" fill="var(--on-brand)" text-anchor="middle">${this.P(lastC)}</text>` : "";
    // 그린 선
    const dr = sp ? "" : this.drawsSVG(G), drV = sp ? "" : this.drawsSVG(G, true);
    // 아래 지표
    let pn = "", top = mainB + PG;
    panes.forEach(k => {
      const bot = top + paneH, name = (CX_PANES.find(p => p[0] === k) ?? CX_PANES[0])[1], daily = !intra || k === "vol";
      const vals = vis.map(b => k === "vol" ? b.v * VOL_K : (b[k] ?? 0)), signed = k === "inst" || k === "foreign" || k === "retail";
      const mx = Math.max(1, ...vals.map(Math.abs)), mid = signed ? (top + bot) / 2 : bot, sc = (signed ? paneH / 2 - 3 : paneH - 14) / mx;
      G.panes.push({ k, top, bot, mid, sc, signed, name, daily });
      pn += `<line x1="${L}" x2="${W - R}" y1="${top - PG / 2}" y2="${top - PG / 2}" stroke="var(--chart-sep)"/>`;
      if (!daily) pn += `<text x="${L + plotW / 2}" y="${(top + bot) / 2 + 4}" font-size="12" fill="var(--muted-soft)" text-anchor="middle">${name}은 하루 단위로만 나와요</text>`;
      else {
        if (signed) pn += `<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" stroke="var(--chart-grid)"/>`;
        vis.forEach((b, j) => { const v = vals[j], h = Math.max(1, Math.abs(v) * sc), px = x(i0 + j), c = k === "vol" ? col(b) : k === "short" ? "var(--muted-soft)" : v >= 0 ? "var(--cx-up)" : "var(--cx-dn)";
          pn += `<rect x="${px - bw / 2}" y="${signed ? (v >= 0 ? mid - h : mid) : bot - h}" width="${bw}" height="${h}" fill="${c}" opacity="${k === "vol" ? (i0 + j === n - 1 ? .9 : .38) : .6}"/>`; });
        if (k === "vol") { const A = sma(bars.map(b => b.v * VOL_K), S.volN), pts: string[] = []; for (let i = i0; i <= i1; i++) { const v = A[i]; if (v != null) pts.push(`${x(i).toFixed(1)},${(bot - v * sc).toFixed(1)}`); }
          if (pts.length > 1) pn += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--ink-muted)" stroke-width="1.1"/>`; G.volMa = A; }
        pn += `<text x="${W - R + 8}" y="${top + 10}" font-size="10.5" fill="var(--chart-axis)">${shares(mx)}</text>`;
      }
      pn += `<text class="halo cx-pl" data-pk="${k}" x="${L + 6}" y="${top + 11}" font-size="11.5" fill="var(--ink-muted)"></text>`;
      top = bot + PG;
    });
    // 용어 풀이에서 화면 위치를 가리킬 때 쓰는 투명 영역
    const tz = (t: string, y0: number, h: number) => `<rect class="tz" data-topic="${t}" x="${L}" y="${y0}" width="${plotW}" height="${h}" rx="4"/>`;
    const vp = G.panes.find(p => p.k === "vol");
    const zones = tz("candle", T, mainB - T) + (vp ? tz("vol", vp.top, vp.bot - vp.top) : "") + (S.levels && LV ? [LV.sup, LV.res].filter(p => y(p) > T && y(p) < mainB).map(p => tz("sup", y(p) - 10, 20)).join("") : "");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${esc(s)} ${CX_IV[S.iv][0]} ${(CX_TYPES.find(t => t[0] === type) ?? CX_TYPES[0])[1]} 차트`);
    svg.innerHTML = `<defs><clipPath id="cx-clip"><rect x="${L}" y="0" width="${W - L}" height="${mainB}"/></clipPath><clipPath id="cx-clip-p"><rect x="${L}" y="${mainB}" width="${W - L}" height="${H - mainB}"/></clipPath></defs>${zones}${g}
    <line x1="${W - R}" x2="${W - R}" y1="${T - 30}" y2="${H - XA}" stroke="var(--chart-sep)"/><line x1="${L}" x2="${W - R}" y1="${H - XA}" y2="${H - XA}" stroke="var(--chart-sep)"/>
    <g clip-path="url(#cx-clip)">${agent}${ser}${ma}${hl2}${refSvg}${dr}</g><g clip-path="url(#cx-clip-p)">${pn}</g>${levels}${evs}${now}${drV}<g class="cx-cross"></g>`;
    // 떠 있는 것: 범위 자동 버튼, 선택한 선 지우기, 지지선 메뉴
    const sel = this.sel ? this.draws.find(d => d.id === this.sel) : undefined;
    let fl = this.ylock ? `<button class="cx-auto" data-cx="yauto" style="right:4px;top:${T - 38}px">자동 범위</button>` : "";
    if (sel && !sp) { const pts = [sel.a, sel.b || sel.a], px = Math.max(...pts.map(pt => x(idxAt(G, pt.t)))), py = Math.min(...pts.map(pt => y(pt.p)));
      const fx2 = sel.k === "hline" ? L + plotW - 40 : Math.min(L + plotW - 34, px + 8), fy = sel.k === "vline" ? T + 4 : Math.max(T, py - 34);
      fl += `<button class="iconbtn cx-del" data-cx="del" aria-label="선 지우기" style="left:${fx2}px;top:${fy}px">${cxIc("trash")}</button>`; }
    if (this.props.pop && S.levels && LV) { const D = this.daily(), touches = D.length ? supportTouches(D, LV.sup).length : 0, sc = this.props.supCourses;
      fl += `<div class="popover" style="left:${L + 6}px;top:${Math.min(mainB - 40, y(LV.sup) + 16)}px" role="dialog" aria-label="지지선 작업">
      <h3><span style="width:10px;height:3px;background:var(--yellow);display:inline-block"></span>지지선 ${this.usd(LV.sup)}</h3>
      <p>최근 12거래일 중 ${touches}번 이 가격 근처까지 내려왔다가 다시 올라갔어요. 이 가격 근처에서 사려는 사람이 많았다는 기록이에요. 현재가보다 ${((1 - LV.sup / this.props.cur) * 100).toFixed(1)}% 아래예요.</p>
      <div class="list">
        <button data-act="rule" data-s="${esc(s)}" data-price="${LV.sup}" data-dir="below">${ic.bell}이 가격에 알림<small>규칙</small></button>
        <button data-act="order" data-s="${esc(s)}" data-price="${LV.sup}"><span class="up">${ic.cart}</span>이 가격에 매수 예약<small>지정가</small></button>
        <button data-act="ask-level"><span class="caution">${ic.spark}</span>이 지지선에 대해 묻기</button>
        <button data-act="go" data-href="course.html?topic=sup"><span>${ic.check}</span>지지선 실전 차트${sc != null ? `<small>${sc}개</small>` : ""}</button>
      </div></div>`; }
    if (this.ev != null && G.evPos[this.ev]) fl += this.eventPop(G);
    float.innerHTML = fl;
    this.renderHover();
    const hk = this.props.topicHl;
    if (hk?.length) hk.forEach(k => svg.querySelectorAll(`.tz[data-topic="${k}"]`).forEach(r => r.classList.add("topic-hl")));
  }
  private nextEarn() { return (this.props.upcoming ?? []).filter(u => u.earn).sort((a, b) => a.t.getTime() - b.t.getTime())[0]; }
  private dday(d: Date) { return Math.round((d.getTime() - (this.props.today ?? new Date()).getTime()) / 864e5); }
  /** 오늘 거래량이 최근 20일 평균의 몇 배인지 */
  private volX() { const C = this.daily(); if (C.length < 2) return 1; const prev = C.slice(-21, -1); return C[C.length - 1].v / (prev.reduce((a, d) => a + d.v, 0) / Math.max(1, prev.length)); }

  /* 시간축 이름표를 누르면 뜨는 작은 창. 그날(실적은 다음 거래일) 실제로 얼마나 움직였는지만 적는다 */
  private eventPop(G: Geo) {
    if (this.ev === "next") {
      const rows = (this.props.upcoming ?? []).slice().sort((a, b) => a.t.getTime() - b.t.getTime()).map(u => `<li><time>${md(u.t)}</time><span>${esc(u.title)} <span class="tag">D-${this.dday(u.t)}</span></span></li>`).join("");
      return `<div class="popover cx-evpop" role="dialog" aria-label="다가올 일정" style="right:4px;bottom:${G.XA + 4}px"><h3>다가올 일정</h3><ul class="events">${rows}</ul></div>`;
    }
    const e = this.props.events[+(this.ev ?? -1)]; if (!e) return "";
    const [px, py] = G.evPos[this.ev as string], D = this.daily();
    const i = D.findIndex(b => b.t.toDateString() === e.t.toDateString()), j = e.k === "earn" ? i + 1 : i;
    let fact = "";
    if (i > 0 && j < D.length) {
      const r = (D[j].c / D[j - 1].c - 1) * 100, av = D.slice(Math.max(0, j - 20), j).reduce((a, b) => a + b.v, 0) / Math.min(20, j);
      fact = `<div class="brief-figs"><span>${e.k === "earn" ? "다음 거래일" : "그날"} <b class="${tone(r)}">${pct(r)}</b></span><span>거래량 평소의 <b>${(D[j].v / av).toFixed(1)}배</b></span></div>`;
    }
    const left = Math.max(G.L, Math.min(G.W - G.R - 260, px - 128));
    return `<div class="popover cx-evpop" role="dialog" aria-label="${e.k === "earn" ? "실적 발표" : "뉴스"}" style="left:${left}px;bottom:${G.H - py + 14}px">
    <h3>${e.k === "earn" ? "실적 발표" : "뉴스"}<span class="t-caption">${mdw(e.t)}</span></h3>
    ${e.k === "news" ? `<p>${esc(e.title)}</p>` : ""}${fact}
    ${e.n != null ? `<button class="linkbtn" data-act="news" data-n="${e.n}">기사 보기 ${ic.chevR}</button>` : ""}</div>`;
  }
  private drawsSVG(G: Geo, onlyV?: boolean) {
    const list = this.draws.concat(this.draft ? [this.draft] : []).filter(d => (d.k === "vline") === !!onlyV);
    const X = (pt: DrawPoint) => G.x(idxAt(G, pt.t)), Y = (pt: DrawPoint) => G.y(pt.p), bot = G.H - G.XA;
    return list.map(d => {
      const on = d.id === this.sel || d === this.draft, c = "var(--brand)", a = d.a, b = d.b || d.a, ax = X(a), ay = Y(a), bx = X(b), by = Y(b);
      let shape = "", hit = "";
      if (d.k === "trend") { shape = `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${c}" stroke-width="1.6"/>`; hit = `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="transparent" stroke-width="12"/>`; }
      else if (d.k === "hline") { shape = `<line x1="${G.L}" x2="${G.W - G.R}" y1="${ay}" y2="${ay}" stroke="${c}" stroke-width="1.3"/><rect x="${G.W - G.R + 3}" y="${ay - 10}" width="${G.R - 6}" height="20" rx="4" fill="${c}" opacity=".85"/><text x="${G.W - G.R / 2}" y="${ay + 4}" font-size="11.5" font-weight="600" fill="var(--on-brand)" text-anchor="middle">${this.P(a.p)}</text>`;
        hit = `<line x1="${G.L}" x2="${G.W - G.R}" y1="${ay}" y2="${ay}" stroke="transparent" stroke-width="12"/>`; }
      else if (d.k === "vline") { if (ax < G.L || ax > G.W - G.R) return ""; shape = `<line x1="${ax}" x2="${ax}" y1="${G.T}" y2="${bot}" stroke="${c}" stroke-width="1.3"/><rect x="${ax - 46}" y="${bot + 2}" width="92" height="19" rx="4" fill="${c}" opacity=".85"/><text x="${ax}" y="${bot + 15}" font-size="11" font-weight="600" fill="var(--on-brand)" text-anchor="middle">${this.short(new Date(a.t))}</text>`;
        hit = `<line x1="${ax}" x2="${ax}" y1="${G.T}" y2="${bot}" stroke="transparent" stroke-width="12"/>`; }
      else {
        const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay);
        if (d.k === "rect") shape = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-width="1.3"/>`;
        else if (d.k === "ellipse") shape = `<ellipse cx="${x0 + w / 2}" cy="${y0 + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="var(--caution)" fill-opacity=".12" stroke="var(--caution)" stroke-width="1.4"/>`;
        else {
          const dp = b.p - a.p, upm = dp >= 0, mc = upm ? "var(--cx-up)" : "var(--cx-dn)", nb = Math.round(idxAt(G, b.t) - idxAt(G, a.t));
          const ms = Math.abs(b.t - a.t), span = this.intra() ? (ms >= 864e5 ? `${Math.round(ms / 864e5)}일` : ms >= 36e5 ? `${(ms / 36e5).toFixed(1)}시간` : `${Math.round(ms / 6e4)}분`) : `${Math.round(ms / 864e5)}일`;
          const t1 = `${dp >= 0 ? "+" : ""}${this.P(dp)} (${pct(dp / a.p * 100)})`, t2 = `${Math.abs(nb)}개 막대 · ${span}`, lw = Math.max(t1.length, t2.length) * 7 + 16;
          const lx = Math.min(x0 + w / 2 - lw / 2, G.W - G.R - lw - 2), lyy = upm ? Math.max(G.T, y0 - 44) : Math.min(G.mainB - 40, y0 + h + 6);
          shape = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${mc}" fill-opacity=".12"/><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${mc}" stroke-dasharray="4 3"/>
          <rect x="${lx}" y="${lyy}" width="${lw}" height="38" rx="5" fill="${mc}"/><text x="${lx + lw / 2}" y="${lyy + 16}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${t1}</text><text x="${lx + lw / 2}" y="${lyy + 31}" font-size="11" fill="#fff" text-anchor="middle">${t2}</text>`;
        }
        hit = `<rect x="${x0}" y="${y0}" width="${Math.max(w, 6)}" height="${Math.max(h, 6)}" fill="transparent"/>`;
      }
      const hs: [string, number, number][] = d.k === "hline" || d.k === "vline" ? [["a", ax, ay]] : [["a", ax, ay], ["b", bx, by]];
      const handles = on && d !== this.draft ? hs.map(([w, hx, hy]) => `<circle data-dh="${w}" data-di="${esc(d.id)}" cx="${d.k === "hline" ? G.L + G.plotW / 2 : hx}" cy="${d.k === "vline" ? (G.T + bot) / 2 : hy}" r="5" fill="var(--canvas)" stroke="${c}" stroke-width="1.6" style="cursor:move"/>`).join("") : "";
      return `<g class="cx-d${on ? " on" : ""}" data-di="${esc(d.id)}" style="cursor:${d === this.draft ? "crosshair" : "pointer"}">${shape}${hit}${handles}</g>`;
    }).join("");
  }
  /* 마우스를 올린 막대의 시가·고가·저가·종가, 이동평균, 아래 지표 값과 십자선 */
  private renderHover() {
    const G = this.geo, box = this.box; if (!G || !G.n) return;
    const h = this.hover, sp = this.special(), B = G.bars, S = this.S;
    // 마우스가 차트 위에 없으면 이름만 두고 숫자는 비운다. 종목 이름과 봉 간격은 위 도구 줄에 이미 있어서 범례에서 뺀다
    const i = h ? Math.max(0, Math.min(G.n - 1, Math.round(G.fiAt(h.x)))) : -1, b = h ? B[i] : null, pv = i > 0 ? B[i - 1] : null;
    // 가격 옆 괄호는 전날 종가 대비 등락률 (첫 봉은 비교할 전날이 없어 생략)
    const cell = (name: string, v: number | undefined) => `<span><span class="muted">${name}</span>${b && v != null ? ` <b>${this.usd(v)}</b>${pv ? ` <span class="${tone(v - pv.c)}">(${pct((v / pv.c - 1) * 100)})</span>` : ""}` : ""}</span>`;
    const leg = box.querySelector(".cx-legend");
    if (leg) leg.innerHTML = `<div class="cx-l1">
      ${sp ? `<span><span class="muted">${S.type === "renko" ? "칸" : "선"}</span>${b ? ` ${this.usd(b.o)} → <b class="${tone(b.c - b.o)}">${this.usd(b.c)}</b>` : ""}</span><span class="muted">한 칸 ${this.P(this.boxSize)}${this.curName()}</span>`
        : cell("시작", b?.o) + cell("고가", b?.h) + cell("저가", b?.l) + cell("종가", b?.c)}</div>
    ${sp ? "" : `<div class="cx-l2"><span class="muted">이동평균선</span>${S.ma.map((p, k) => { const mv = G.maVals[k]?.[i]; return S.maOn[k] ? `<span><span style="color:${CX_MA_COL[k]}">${p}</span>${b && mv != null ? ` ${this.usd(mv)}` : ""}</span>` : ""; }).join("")}</div>`}`;
    G.panes.forEach(P => { const el = box.querySelector(`.cx-pl[data-pk="${P.k}"]`); if (!el) return;
      if (!P.daily || !b) { el.textContent = P.k === "vol" ? `거래량(${S.volN})` : P.name; return; }
      const v = P.k === "vol" ? b.v * VOL_K : (b[P.k] ?? 0), vm = G.volMa?.[i];
      el.textContent = P.k === "vol" ? `거래량(${S.volN}) ${shares(v)} · 평균 ${vm != null ? shares(vm) : "-"}` : `${P.name} ${P.signed && v > 0 ? "+" : ""}${shares(v)}`; });
    const cross = box.querySelector(".cx-cross"); if (!cross) return;
    if (!h || !b) { cross.innerHTML = ""; return; }
    const px = G.x(i), bot = G.H - G.XA;
    let hy = h.y, lab = "";
    if (this.tool && S.magnet && h.y <= G.mainB && !sp) { const p = G.yInv(h.y); hy = G.y([b.o, b.h, b.l, b.c].reduce((a, v) => Math.abs(v - p) < Math.abs(a - p) ? v : a)); }
    if (hy >= G.T && hy <= G.mainB) lab = this.P(G.yInv(hy));
    else { const P = G.panes.find(P => hy >= P.top && hy <= P.bot); if (P && P.daily) lab = shares(P.signed ? (P.mid - hy) / P.sc : (P.bot - hy) / P.sc); }
    cross.innerHTML = `<line x1="${px}" x2="${px}" y1="${G.T - 4}" y2="${bot}" stroke="var(--ink-muted)" stroke-dasharray="3 3" pointer-events="none"/>
    ${lab ? `<line x1="${G.L}" x2="${G.W - G.R}" y1="${hy}" y2="${hy}" stroke="var(--ink-muted)" stroke-dasharray="3 3" pointer-events="none"/><rect x="${G.W - G.R + 3}" y="${hy - 10}" width="${G.R - 6}" height="20" rx="4" fill="var(--ink)" pointer-events="none"/><text x="${G.W - G.R / 2}" y="${hy + 4}" font-size="11.5" font-weight="600" fill="var(--canvas)" text-anchor="middle" pointer-events="none">${lab}</text>` : ""}
    <rect x="${px - 58}" y="${bot + 2}" width="116" height="19" rx="4" fill="var(--ink)" pointer-events="none"/><text x="${px}" y="${bot + 15}" font-size="11" font-weight="600" fill="var(--canvas)" text-anchor="middle" pointer-events="none">${this.short(b.t)}</text>`;
  }

  /* ---------- 마우스 ---------- */
  private xy(e: { clientX: number; clientY: number }): [number, number] { const r = (this.box.querySelector(".cx-svg") as Element).getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  private finish(pt: DrawPoint) {
    const d = this.draft; if (!d) return; d.b = pt; this.draft = null; this.drag = null;
    this.draws.push(d); this.sel = d.id; this.tool = null; this.saveDraw(); this.renderUI();
  }
  private bind() {
    const box = this.box, on = <K extends keyof DocumentEventMap>(t: EventTarget, k: K, f: (e: DocumentEventMap[K]) => void, o?: AddEventListenerOptions | boolean) => {
      const h = f as EventListener; t.addEventListener(k, h, o); this.off.push(() => t.removeEventListener(k, h, o)); };
    on(box, "pointerdown", e => this.onDown(e));
    on(document, "pointermove", e => this.onMove(e));
    on(document, "pointerup", () => this.onUp());
    // 차트에서 곧장 브라우저 창 밖으로 나가면 pointermove가 더 오지 않으니, 창을 벗어날 때도 범례를 비운다
    on(document, "mouseout", e => { if (!e.relatedTarget && this.hover && !this.drag) { this.hover = null; this.renderHover(); } });
    on(document, "click", e => { if (this.noClick) { this.noClick = false; if ((e.target as Element).closest?.(".cx-svg")) { e.stopPropagation(); e.preventDefault(); } } }, true);
    on(box, "wheel", e => this.onWheel(e), { passive: false });
    on(document, "click", e => this.onClick(e));
    on(box, "change", e => this.onChange(e));
    if (typeof ResizeObserver !== "undefined") { const plot = box.querySelector(".cx-plot"); if (plot) { this.ro = new ResizeObserver(() => this.later()); this.ro.observe(plot); } }
    else on(window, "resize", () => this.later());
  }
  private onDown(e: PointerEvent) {
    const target = e.target as Element, svg = target.closest?.(".cx-svg"), G = this.geo; if (!svg || !G || e.button !== 0) return;
    const [mx, my] = this.xy(e), sp = this.special();
    if (this.menu) { this.menu = null; this.renderUI(); }
    if (mx > G.W - G.R && my < G.mainB) { this.ylock = { lo: G.lo, hi: G.hi }; this.drag = { k: "ys", y0: my, lo: G.lo, hi: G.hi }; e.preventDefault(); return; }
    if (my > G.H - G.XA) { this.drag = { k: "xs", x0: mx, c0: this.count }; e.preventDefault(); return; }
    if (this.tool && !sp) {
      const pt = this.point(G, mx, my);
      if (this.tool === "hline" || this.tool === "vline") { const d: Drawing = { id: "d" + Date.now(), k: this.tool, a: pt }; this.draws.push(d); this.sel = d.id; this.tool = null; this.saveDraw(); this.renderUI(); this.drawPlot(); e.preventDefault(); return; }
      if (!this.draft) { this.draft = { id: "d" + Date.now(), k: this.tool, a: pt, b: pt }; this.drag = { k: "draft", x0: mx, y0: my, moved: false }; }
      else this.finish(pt);
      this.drawPlot(); e.preventDefault(); return;
    }
    const dh = target.closest<HTMLElement>("[data-dh]"), di = target.closest<HTMLElement>("[data-di]");
    if (dh) { this.drag = { k: "dh", id: dh.dataset.di ?? "", w: dh.dataset.dh === "b" ? "b" : "a" }; e.preventDefault(); return; }
    if (di) { const d = this.draws.find(x => x.id === di.dataset.di); if (d) { this.sel = d.id; this.drag = { k: "dmove", id: d.id, x0: mx, y0: my, a: { ...d.a }, b: d.b ? { ...d.b } : null }; this.drawPlot(); e.preventDefault(); return; } }
    if (target.closest(".lvl, .cx-ev")) return;   // 지지·저항선과 시간축 이름표는 그대로 눌리게
    if (this.sel) { this.sel = null; this.drawPlot(); }
    this.drag = { k: "pan", x0: mx, y0: my, e0: this.end ?? 0, lock: this.ylock ? { ...this.ylock } : null, moved: false };
    e.preventDefault();
  }
  private onMove(e: PointerEvent) {
    const G = this.geo, D = this.drag; if (!G) return;
    if (!D) {
      const over = (e.target as Element).closest?.(".cx-svg");
      if (over && this.box.contains(over)) { const [mx, my] = this.xy(e); this.hover = { x: mx, y: my }; if (this.draft) { this.draft.b = this.point(G, mx, my); this.later(); } else this.renderHover(); }
      else if (this.hover) { this.hover = null; this.renderHover(); }
      return;
    }
    const [mx, my] = this.xy(e); this.hover = { x: mx, y: my };
    if (D.k === "pan") {
      if (Math.abs(mx - D.x0) + Math.abs(my - D.y0) > 3) { D.moved = true; document.body.classList.add("cx-grab"); }
      this.end = D.e0 + (D.x0 - mx) / G.step;
      if (D.lock) { const dp = (my - D.y0) / (G.mainB - G.T) * (D.lock.hi - D.lock.lo); this.ylock = { lo: D.lock.lo + dp, hi: D.lock.hi + dp }; }
    } else if (D.k === "ys") { const f = Math.exp((my - D.y0) * 0.006), c = (D.lo + D.hi) / 2, hh = (D.hi - D.lo) / 2 * f; this.ylock = { lo: c - hh, hi: c + hh }; }
    else if (D.k === "xs") this.count = D.c0 * Math.exp(-(mx - D.x0) * 0.005);
    else if (D.k === "draft") { if (this.draft) this.draft.b = this.point(G, mx, my); if (Math.abs(mx - D.x0) + Math.abs(my - D.y0) > 5) D.moved = true; }
    else if (D.k === "dh") { const d = this.draws.find(x => x.id === D.id); if (d) d[D.w] = this.point(G, mx, my); }
    else if (D.k === "dmove") { const d = this.draws.find(x => x.id === D.id); if (d) {
      const di = G.fiAt(mx) - G.fiAt(D.x0), dp = G.yInv(my) - G.yInv(D.y0), mv = (pt: DrawPoint) => ({ t: timeAt(G, idxAt(G, pt.t) + di), p: pt.p + dp });
      d.a = mv(D.a); if (D.b) d.b = mv(D.b); } }
    this.later();
  }
  private onUp() {
    const D = this.drag; if (!D) return;
    document.body.classList.remove("cx-grab");
    if (D.k === "draft") { if (D.moved && this.draft?.b) { this.finish(this.draft.b); this.drawPlot(); } else this.drag = null; return; }   // 끌지 않고 눌렀으면 두 번째 점을 기다린다
    if (D.k === "pan" && D.moved) this.noClick = true;
    if (D.k === "dh" || D.k === "dmove") this.saveDraw();
    this.drag = null;
  }
  /* 휠: 위아래는 확대·축소(마우스 자리 기준), 좌우는 옆으로 넘기기 */
  private onWheel(e: WheelEvent) {
    const svg = (e.target as Element).closest?.(".cx-svg"), G = this.geo; if (!svg || !G) return;
    e.preventDefault();
    const [mx] = this.xy(e);
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { this.end = (this.end ?? 0) + e.deltaX / G.step; this.later(); return; }
    const fi = G.fiAt(mx); this.count *= Math.exp(e.deltaY * 0.0015); this.clamp(G.n);
    this.end = fi - 0.5 + (G.L + G.plotW - mx) / (G.plotW / this.count); this.later();
  }
  /* 도구 막대·메뉴 */
  private onClick(e: MouseEvent) {
    const target = e.target as Element, box = this.box, inside = box.contains(target);
    const act = inside ? target.closest<HTMLElement>("[data-act]") : null;
    if (act) { e.preventDefault(); const { act: a, ...rest } = act.dataset; this.props.onAction(a ?? "", rest as Record<string, string>); return; }
    const el = inside ? target.closest<HTMLElement>("[data-cx]") : null;
    if (!el) { if (this.menu && !target.closest(".cx-menu")) { this.menu = null; this.renderUI(); }
      if (this.ev != null && !target.closest(".cx-evpop")) { this.ev = null; this.drawPlot(); } return; }
    const a = el.dataset.cx, v = el.dataset.v ?? "", S = this.S;
    if (a === "ev") { this.ev = this.ev === v ? null : v; this.drawPlot(); return; }
    const redo = () => { this.end = null; this.draft = null; this.ev = null; this.save(); this.renderUI(); this.drawPlot(); };
    if (a === "menu") { this.menu = this.menu === v ? null : v; this.renderUI(); return; }
    if (a === "iv") { S.iv = v as Interval; this.menu = null; redo(); return; }
    if (a === "type") { S.type = v as ChartType; this.menu = null; this.tool = null; redo(); return; }
    if (a === "tool") { this.tool = this.tool === v ? null : v as ToolKey; this.draft = null; this.sel = null; this.renderUI(); this.drawPlot(); return; }
    if (a === "magnet") { S.magnet = !S.magnet; this.save(); this.renderUI(); return; }
    if (a === "clear") { const n = this.draws.length; this.draws = []; this.sel = null; this.saveDraw(); this.renderUI(); this.drawPlot(); if (n) this.props.onAction("toast", { msg: `그린 선 ${n}개를 지웠어요.` }); return; }
    if (a === "del") { this.draws = this.draws.filter(d => d.id !== this.sel); this.sel = null; this.saveDraw(); this.renderUI(); this.drawPlot(); return; }
    if (a === "yauto") { this.ylock = null; this.drawPlot(); return; }
    if (a === "reset") { this.menu = null; redo(); return; }
    if (a === "ma") { S.maOn[+v] = !S.maOn[+v]; this.save(); this.renderUI(); this.drawPlot(); return; }
    if (a === "levels" || a === "hilo") { S[a] = !S[a]; this.save(); this.renderUI(); this.drawPlot(); return; }
    if (a === "colors") { S.colors = v === "us" ? "us" : "kr"; box.dataset.colors = S.colors; this.save(); this.renderUI(); return; }
    if (a === "pane") {
      const pk = v as PaneKey;
      if (S.panes.includes(pk)) S.panes = S.panes.filter(k => k !== pk);
      else if (S.panes.length >= 3) { this.props.onAction("toast", { msg: "아래 지표는 3개까지 볼 수 있어요. 하나를 끄고 켜 주세요." }); return; }
      else S.panes = S.panes.concat(pk);
      this.save(); this.renderUI(); this.drawPlot(); return;
    }
  }
  private onChange(e: Event) {
    const t = e.target as HTMLInputElement, k = t.dataset?.cxIn; if (!k) return;
    const v = Math.max(1, Math.min(250, Math.round(+t.value) || 1)); t.value = String(v);
    if (k === "volN") this.S.volN = v; else this.S.ma[+k.slice(2)] = v;
    this.save(); this.drawPlot();
  }
}

/** 컨테이너에 종목 차트를 마운트한다. 돌려주는 핸들로 props 를 갱신하고(update) 떼어낸다(destroy) */
export function mountMainChart(container: HTMLElement, props: MainChartProps): MainChartHandle {
  const c = new MainChart(container, props);
  return { update: p => c.update(p), destroy: () => c.destroy() };
}
