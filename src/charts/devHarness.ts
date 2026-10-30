/* 개발용 확인 페이지. 가짜 막대를 만들어 종목 차트·지도·코스 차트를 한 화면에 마운트한다.
   src/main.tsx 에서 쓰지 않는다. 직접 import 해서 mountDevHarness(document.body) 로 연다 (gops.css 가 있어야 모양이 맞다) */
import { renderCourseChart, type CourseQuestion } from "./courseChart";
import { rng } from "./format";
import { seriesOf } from "./indicators";
import { mountMainChart, type MainChartProps } from "./mainChart";
import { focusTreemap, renderTreemap, type TreemapSector } from "./treemap";
import type { Bar, ChartSettings, CourseRow, Drawing } from "./types";
import { DEFAULT_CHART_SETTINGS } from "./types";

/** 평일만 있는 가짜 일봉 n개. 마지막 날은 2026-09-30 */
export function fakeDaily(seed: number, n = 600, start = 120): Bar[] {
  const r = rng(seed), out: Bar[] = [], d = new Date(2026, 8, 30); let c = start;
  for (let i = 0; i < n; i++) {
    const o = c, nc = Math.max(5, o * (1 + (r() - 0.49) * 0.04)), h = Math.max(o, nc) * (1 + r() * 0.012), l = Math.min(o, nc) * (1 - r() * 0.012), v = 150 + r() * 110 * 1;
    const vol = v * 1e6;
    out.push({ t: new Date(d), o, h, l, c: nc, v, short: vol * (0.18 + r() * 0.22), inst: vol * (r() - 0.5) * 0.16, foreign: vol * (r() - 0.5) * 0.2, retail: 0 });
    out[out.length - 1].retail = -((out[out.length - 1].inst ?? 0) + (out[out.length - 1].foreign ?? 0));
    c = nc;
    do d.setDate(d.getDate() - 1); while (d.getDay() % 6 === 0);
  }
  return out.reverse();
}
/** 최근 5거래일 1분봉 */
export function fakeMinute(daily: Bar[], seed: number): Bar[] {
  const r = rng(seed), out: Bar[] = [];
  daily.slice(-5).forEach((dd, di, arr) => {
    const N = di === arr.length - 1 ? 13 : 390; let p = dd.o;
    for (let k = 0; k < N; k++) { const t = new Date(dd.t); t.setHours(9, 30 + k, 0, 0); const o = p, c = Math.min(dd.h, Math.max(dd.l, o + (r() - 0.5) * (dd.h - dd.l) * 0.1)); out.push({ t, o, c, h: Math.max(o, c), l: Math.min(o, c), v: dd.v / N }); p = c; }
  });
  return out;
}

export function mountDevHarness(root: HTMLElement) {
  root.innerHTML = `<div style="display:grid;gap:16px;padding:16px">
    <section class="panel" style="height:520px;display:flex;flex-direction:column"><div id="dh-chart" class="chartbox"></div></section>
    <section class="panel" style="height:420px;display:flex"><div class="treemap-wrap"><div class="treemap" id="dh-map"></div><div class="hoverinfo" hidden></div></div></section>
    <section class="panel c-fig" id="dh-course" style="max-width:720px"></section></div>`;
  const daily = fakeDaily(7), minute = fakeMinute(daily, 9);
  let settings: ChartSettings = { ...DEFAULT_CHART_SETTINGS }, drawings: Drawing[] = [];
  const last = daily[daily.length - 1], sup = Math.min(...daily.slice(-12).map(b => b.l)), res = Math.max(...daily.slice(-120).map(b => b.h)) * 1.03;
  const events = [...Array.from({ length: 8 }, (_, k) => { const d = new Date(last.t); d.setDate(d.getDate() - 91 * (k + 1)); while (d.getDay() % 6 === 0) d.setDate(d.getDate() - 1); return { t: d, k: "earn" as const, title: "실적 발표" }; }),
    { t: daily[daily.length - 4].t, k: "news" as const, title: "새 칩 출하가 앞당겨진다는 보고서", n: 3 }].sort((a, b) => b.t.getTime() - a.t.getTime());
  const next = new Date(last.t); next.setDate(next.getDate() + 23);
  const el = root.querySelector<HTMLElement>("#dh-chart") as HTMLElement;
  const props = (): MainChartProps => ({
    sym: "NVDA", bars: seriesOf(settings.iv, daily, minute), daily, cur: last.c, settings, drawings, events,
    upcoming: [{ t: next, title: "실적 발표", earn: true }], today: last.t, levels: { sup, res }, refLines: [{ k: "avg", label: "내 평단", p: last.c * 0.93 }],
    fx: 1382.5, cur$: "krw", board: true,
    onSettings: s => { settings = s; chart.update(props()); },
    onDrawings: d => { drawings = d; },
    onAction: (act, payload) => console.log("[chart action]", act, payload),
  });
  const chart = mountMainChart(el, props());
  const sectors: TreemapSector[] = [["기술", [["NVDA", 4400, 2.3], ["MSFT", 3800, 0.4], ["AAPL", 3600, -0.8], ["AVGO", 1500, 1.9], ["ORCL", 800, 3.1]]], ["금융", [["JPM", 820, -0.3], ["V", 600, 0.2], ["MA", 500, 0.1], ["BAC", 330, -1.1]]], ["헬스케어", [["LLY", 820, 1.2], ["UNH", 500, -2.4], ["JNJ", 380, 0.3]]], ["소비재", [["AMZN", 2300, 0.9], ["TSLA", 1100, -3.2], ["WMT", 700, 0.5]]]];
  const map = root.querySelector<HTMLElement>("#dh-map") as HTMLElement;
  const drawMap = () => { const { width, height } = map.getBoundingClientRect(); map.innerHTML = renderTreemap({ sectors, width, height, logoUrl: () => null, markColor: () => "#4B5563", href: s => `/stock?s=${s}` }); focusTreemap(map, null); };
  drawMap();
  const rows: CourseRow[] = daily.slice(-40).map(b => [`${b.t.getFullYear()}-${String(b.t.getMonth() + 1).padStart(2, "0")}-${String(b.t.getDate()).padStart(2, "0")}`, +b.o.toFixed(2), +b.h.toFixed(2), +b.l.toFixed(2), +b.c.toFixed(2), Math.round(b.v * 1e6)]);
  const q: CourseQuestion = { id: "c3", kind: "tap", fig: { chart: "x", vol: true, rsi: true }, ans: () => rows.map((r, i) => r[4] < r[1] ? i : -1).filter(i => i >= 0) };
  const course = root.querySelector<HTMLElement>("#dh-course") as HTMLElement;
  course.innerHTML = renderCourseChart({ q, chart: { sym: "NVDA", name: "엔비디아", iv: "일봉", rows }, state: { sel: [3, 5], level: null, choice: null, checked: false, hint: 0 } });
  return { chart, redraw: drawMap };
}
