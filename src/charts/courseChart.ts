/* 코스 문제 차트. 목업 gops.js의 qChart/qFigure 를 문제·답 상태·차트 줄을 매개변수로 받는 순수 함수로 */
import { esc } from "./format";
import { rsiRows } from "./indicators";
import { candleFig } from "./termFigures";
import type { CourseRow } from "./types";

export type CourseChartData = { sym: string; name: string; iv: string; rows: CourseRow[]; split?: string };

export type CourseFig = {
  /** 그림 종류. 없으면 캔들 차트 */
  type?: "diagram" | "volbars" | "rsibars" | "per";
  chart?: string;
  /** 표시할 날짜 */
  mark?: string;
  /** 전날 종가·시가·종가 이름표 */
  prev?: boolean;
  /** 판정 전에는 회색 캔들 */
  mono?: boolean;
  /** 저항선 가격 */
  level?: number;
  vol?: boolean;
  rsi?: boolean;
  /** volbars 가 보는 날 */
  day?: string;
};

export type CourseQuestion = {
  id: string;
  kind: "choice" | "tap" | "level";
  fig: CourseFig;
  /** choice: 보기 번호, tap: 정답 날 번호(함수면 차트 줄로 계산) */
  ans?: number | number[] | (() => number[]);
  tol?: number;
  /** level: 정답 가격대 [아래, 위] */
  band?: () => [number, number];
  count?: number;
};

/** 지금 풀고 있는 문제의 답 (목업 CQS) */
export type CourseAnswerState = { sel: number[]; level: number | null; choice: number | null; checked: boolean; hint: number };
export const EMPTY_COURSE_STATE: CourseAnswerState = { sel: [], level: null, choice: null, checked: false, hint: 0 };

export const krDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${y}년 ${+m}월 ${+dd}일`; };
export const rowIndexOf = (rows: CourseRow[], d: string) => rows.findIndex(r => r[0] === d);
export const tapAnswers = (q: CourseQuestion): number[] => (typeof q.ans === "function" ? q.ans() : Array.isArray(q.ans) ? q.ans : []);

/** 패널(좁은 화면)에서 보여 줄 구간. zone은 [시작, 끝]이며 번호 또는 날짜 */
export function courseView(zone: [number | string, number | string] | undefined, R: CourseRow[]): [number, number] {
  if (!zone) return [0, R.length - 1];
  const at = (d: number | string, end?: boolean) => typeof d === "number" ? d : end ? R.map(r => r[0]).filter(x => x <= d).length - 1 : R.findIndex(r => r[0] >= d);
  return [at(zone[0]), at(zone[1], true)];
}

export type CourseChartOptions = {
  q: CourseQuestion;
  chart: CourseChartData;
  state: CourseAnswerState;
  /** 그림 폭 (목업 QW). 기본 720 */
  width?: number;
  /** 패널에서 볼 때 (목업 QCOMPACT) */
  compact?: boolean;
  /** 보여 줄 구간 [시작, 끝]. 없으면 전체 */
  view?: [number, number];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const finiteOr = (v: unknown, fb?: number) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? n : fb; };
const dateOr = (v: unknown) => (typeof v === "string" && DATE_RE.test(v) ? v : undefined);
const FIG_TYPES = new Set(["diagram", "volbars", "rsibars", "per"]);

/** 서버에서 온 문제 그림 설정을 그리기 전에 정리한다: 숫자는 Number()로 바꿔 유한하지 않으면 버리고, 날짜는 YYYY-MM-DD 만 남긴다 */
export function sanitizeCourseFig(f: CourseFig | null | undefined): CourseFig {
  const src = (f ?? {}) as Record<string, unknown>, level = finiteOr(src.level);
  return {
    type: FIG_TYPES.has(src.type as string) ? (src.type as CourseFig["type"]) : undefined,
    chart: typeof src.chart === "string" ? src.chart : undefined,
    mark: dateOr(src.mark),
    day: dateOr(src.day),
    prev: src.prev === true,
    mono: src.mono === true,
    vol: src.vol === true,
    rsi: src.rsi === true,
    level: level != null && level > 0 ? level : undefined,
  };
}
/** 문제 전체 정리: 그림 설정과 함께 허용 오차(tol)·고를 개수(count)·정답 번호도 숫자만 남긴다 */
export function sanitizeCourseQuestion(q: CourseQuestion): CourseQuestion {
  const tol = finiteOr(q.tol), count = finiteOr(q.count);
  const ans = typeof q.ans === "function" ? q.ans : Array.isArray(q.ans) ? q.ans.map(a => finiteOr(a)).filter((a): a is number => a != null) : finiteOr(q.ans);
  return { ...q, fig: sanitizeCourseFig(q.fig), tol: tol != null && tol >= 0 ? Math.floor(tol) : undefined, count: count != null && count > 0 ? Math.floor(count) : undefined, ans };
}
const widthOf = (w: unknown) => { const n = finiteOr(w); return n != null && n > 0 ? n : 720; };

/** 캔들 차트 SVG. 날을 고르는 문제는 캔들마다 data-act="cq-tap", 가격을 고르는 문제는 data-act="cq-level" 영역이 들어 있다 */
export function renderCourseChart(o: CourseChartOptions) {
  const q = sanitizeCourseQuestion(o.q), f = q.fig, QW = widthOf(o.width), QCOMPACT = !!o.compact, CQS = o.state, R = o.chart.rows, n = R.length, done = CQS.checked;
  const [va, vb] = o.view ?? [0, n - 1], nv = vb - va + 1, V = R.slice(va, vb + 1), inV = (i: number) => i >= va && i <= vb;
  const PH = QCOMPACT ? 180 : 250, VH = f.vol ? (QCOMPACT ? 50 : 70) : 0, RH = f.rsi ? (QCOMPACT ? 70 : 90) : 0, T = 26, L = 8, Rt = QCOMPACT ? 50 : 64, H = T + PH + (VH ? VH + 12 : 0) + (RH ? RH + 12 : 0) + 24;
  let lo = Math.min(...V.map(r => r[3])), hi = Math.max(...V.map(r => r[2]));
  if (f.level) hi = Math.max(hi, f.level * 1.01);
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const step = (QW - L - Rt) / nv, bw = Math.max(2.5, Math.min(22, step * 0.62));
  const x = (i: number) => L + (i - va) * step + step / 2, y = (p: number) => T + (hi - p) / (hi - lo) * PH;
  const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw)), fr = raw / mag, tick = (fr < 1.5 ? 1 : fr < 3.5 ? 2 : fr < 7.5 ? 5 : 10) * mag;
  let g = "";
  for (let p = Math.ceil(lo / tick) * tick; p <= hi; p += tick) g += `<line x1="${L}" x2="${QW - Rt}" y1="${y(p)}" y2="${y(p)}" stroke="var(--chart-grid)"/><text x="${QW - Rt + 8}" y="${y(p) + 4}" font-size="12" fill="var(--chart-axis)">${+p.toFixed(2)}</text>`;
  const ticks = nv <= 20 && !QCOMPACT ? V.map((_, k) => va + k).filter(i => (i - va) % 3 === 0) : QCOMPACT ? [va, Math.round(va + nv / 2), vb] : [va, Math.round(va + nv / 3), Math.round(va + 2 * nv / 3), vb];
  ticks.forEach(i => { const [, m, d] = R[i][0].split("-"); g += `<text x="${x(i)}" y="${H - 6}" font-size="11.5" fill="var(--chart-axis)" text-anchor="${i === va ? "start" : i === vb ? "end" : "middle"}">${+m}/${+d}</text>`; });
  const mi = f.mark ? R.findIndex(r => r[0] === f.mark) : -1;
  if (mi >= 0 && inV(mi) && f.mark) g += `<rect x="${x(mi) - step / 2}" y="${T - 18}" width="${step}" height="${H - T - 6}" fill="var(--brand)" opacity=".1"/><text x="${x(mi)}" y="${T - 6}" font-size="11.5" font-weight="700" fill="var(--brand)" text-anchor="middle">${esc(krDate(f.mark).slice(6))}</text>`;
  // 고른 날·정답 날 표시
  const ans = tapAnswers(q), tol = q.tol || 0, near = (i: number, set: number[]) => set.some(a => Math.abs(a - i) <= tol);
  CQS.sel.filter(inV).forEach(i => { const ok = near(i, ans); g += `<rect x="${x(i) - step / 2 + 1}" y="${T - 4}" width="${step - 2}" height="${PH + 8}" rx="3" fill="${done ? (ok ? "var(--ok)" : "var(--danger)") : "var(--brand)"}" opacity=".16"/>`; });
  if (done) ans.filter(inV).forEach(i => { g += `<circle cx="${x(i)}" cy="${q.id === "t1" ? y(R[i][3]) + 12 : T - 4}" r="${q.id === "t1" ? 8 : 0}" fill="none" stroke="var(--ok)" stroke-width="2.4"/>`; if (q.id !== "t1") g += `<path d="M${x(i) - 6} ${T - 14} h12 l-6 8 z" fill="var(--ok)"/>`; });
  const cs = V.map((r, k) => { const i = va + k, up = r[4] >= r[1], col = f.mono && !done ? "var(--muted-soft)" : up ? "var(--up)" : "var(--down)";
    return `<line x1="${x(i)}" x2="${x(i)}" y1="${y(r[2])}" y2="${y(r[3])}" stroke="${col}" stroke-width="1.2"/><rect x="${x(i) - bw / 2}" y="${y(Math.max(r[1], r[4]))}" width="${bw}" height="${Math.max(1.2, Math.abs(y(r[1]) - y(r[4])))}" fill="${col}"/>`; }).join("");
  let extra = "";
  if (f.prev && mi > 0) { const pc = R[mi - 1][4], r = R[mi], tx = x(mi) + bw / 2 + 8;
    extra += `<line x1="${x(mi - 1)}" x2="${x(mi)}" y1="${y(pc)}" y2="${y(pc)}" stroke="var(--ink-muted)" stroke-dasharray="4 3"/><text class="halo" x="${tx}" y="${y(pc) + 4}" font-size="12" fill="var(--ink-muted)">전날 종가 $${pc.toFixed(2)}</text>
      <text class="halo" x="${x(mi) - bw / 2 - 8}" y="${y(r[1]) + (r[1] >= r[4] ? -2 : 12)}" font-size="12" font-weight="600" fill="var(--ink)" text-anchor="end">시가 $${r[1].toFixed(2)}</text><text class="halo" x="${x(mi) - bw / 2 - 8}" y="${y(r[4]) + (r[4] > r[1] ? -2 : 12)}" font-size="12" font-weight="600" fill="var(--ink)" text-anchor="end">종가 $${r[4].toFixed(2)}</text>`; }
  if (f.level) extra += `<line x1="${L}" x2="${QW - Rt}" y1="${y(f.level)}" y2="${y(f.level)}" stroke="var(--purple)" stroke-width="1.5" stroke-dasharray="6 4"/><text class="halo" x="${L + 6}" y="${y(f.level) - 6}" font-size="11.5" font-weight="600" fill="var(--purple)">저항 $${f.level}</text>`;
  if (q.kind === "level" && q.band) {
    const [a, b] = q.band();
    if (done) extra += `<rect x="${L}" y="${y(b)}" width="${QW - L - Rt}" height="${y(a) - y(b)}" fill="var(--yellow)" opacity=".28"/><text class="halo" x="${QW - Rt - 6}" y="${y(a) - 5}" font-size="11.5" font-weight="600" fill="var(--ink)" text-anchor="end">정답 가격대</text>`;
    if (CQS.level != null) extra += `<line x1="${L}" x2="${QW - Rt}" y1="${y(CQS.level)}" y2="${y(CQS.level)}" stroke="${done ? (CQS.level >= a && CQS.level <= b ? "var(--ok)" : "var(--danger)") : "var(--brand)"}" stroke-width="2"/><text class="halo" x="${L + 6}" y="${y(CQS.level) - 6}" font-size="11.5" font-weight="600" fill="var(--ink)">고른 가격 $${CQS.level.toFixed(2)}</text>`;
    if (!done) extra += `<rect x="${L}" y="${T}" width="${QW - L - Rt}" height="${PH}" fill="transparent" style="cursor:crosshair" data-act="cq-level" data-qw="${QW}" data-t="${T}" data-ph="${PH}" data-hi="${hi}" data-lo="${lo}" data-h="${H}"/>`;
  }
  const h2 = CQS.hint >= 2 && !done;
  if (h2 && q.id === "c2" && mi >= 0) extra += `<line x1="${x(mi)}" x2="${QW - Rt}" y1="${y(R[mi][2])}" y2="${y(R[mi][2])}" stroke="var(--brand)" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="${x(mi)}" cy="${y(R[mi][2])}" r="4" fill="var(--brand)"/>`;
  // 시가와 종가 차이가 작아 차트에서는 안 보이니, 그날 캔들만 크게 확대해 왼쪽 빈 곳에 그린다
  if (h2 && q.id === "c4" && mi >= 0) { const r = R[mi], bx = L + 24, by = T + 6, bh = 150, Z = (p: number) => by + 18 + (r[2] - p) / (r[2] - r[3]) * (bh - 30), cx = bx + 70;
    extra += `<defs><marker id="hArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--brand)"/></marker></defs>
      <rect x="${bx}" y="${by}" width="250" height="${bh}" rx="6" fill="var(--panel)" stroke="var(--brand)"/><text x="${bx + 10}" y="${by + 14}" font-size="11.5" font-weight="600" fill="var(--brand)">5월 25일 캔들 확대</text>
      <line x1="${cx}" x2="${cx}" y1="${Z(r[2])}" y2="${Z(r[3])}" stroke="var(--muted-soft)" stroke-width="2"/><rect x="${cx - 16}" y="${Z(r[1])}" width="32" height="${Z(r[4]) - Z(r[1])}" fill="var(--muted-soft)"/>
      <line x1="${cx + 22}" x2="${cx + 22}" y1="${Z(r[1])}" y2="${Z(r[4])}" stroke="var(--brand)" stroke-width="2.5" marker-end="url(#hArr)"/>
      <text x="${cx + 36}" y="${Z(r[1]) + 4}" font-size="12" fill="var(--ink)">시가 $${r[1].toFixed(2)}</text><text x="${cx + 36}" y="${Z(r[4]) + 4}" font-size="12" fill="var(--ink)">종가 $${r[4].toFixed(2)}</text>`; }
  if (h2 && q.id === "t1") ans.forEach((a, k) => { const x0 = x(Math.max(va, a - 5)) - step / 2, x1 = x(Math.min(vb, a + 5)) + step / 2; extra += `<rect x="${x0}" y="${T}" width="${x1 - x0}" height="${PH}" fill="var(--brand)" opacity=".07" rx="4"/><text x="${(x0 + x1) / 2}" y="${T + 14}" font-size="11.5" font-weight="600" fill="var(--brand)" text-anchor="middle">구간 ${k + 1}</text>`; });
  if (h2 && q.id === "t2") { const ph = R.map((_, i) => i).filter(i => inV(i) && i >= 4 && i < n - 4 && R[i][2] >= Math.max(...R.slice(i - 4, i + 5).map(r => r[2]))); extra += `<polyline points="${ph.map(i => `${x(i)},${y(R[i][2]) - 6}`).join(" ")}" fill="none" stroke="var(--brand)" stroke-width="1.5" stroke-dasharray="5 4"/>${ph.map(i => `<circle cx="${x(i)}" cy="${y(R[i][2]) - 6}" r="4.5" fill="var(--canvas)" stroke="var(--brand)" stroke-width="2"/>`).join("")}`; }
  if (h2 && q.id === "s1") extra += V.map((r, k) => { const i = va + k; return `<circle cx="${x(i)}" cy="${y(r[3])}" r="2.8" fill="var(--brand)"/>`; }).join("");
  let sub = "", top = T + PH + 12;
  if (VH) {
    const vm = Math.max(...V.map(r => r[5]));
    sub += `<line x1="${L}" x2="${QW - Rt}" y1="${top - 6}" y2="${top - 6}" stroke="var(--chart-sep)"/><text x="${QW - Rt + 8}" y="${top + 10}" font-size="11.5" fill="var(--chart-axis)">거래량</text>` + V.map((r, k) => { const i = va + k, h = r[5] / vm * VH; return `<rect x="${x(i) - bw / 2}" y="${top + VH - h}" width="${bw}" height="${h}" fill="${r[4] >= r[1] ? "var(--up)" : "var(--down)"}" opacity="${i === mi ? .95 : .4}"/>`; }).join("");
    top += VH + 12;
  }
  if (RH) {
    const ry = (v: number) => top + (100 - v) / 100 * RH, pts = V.map((_, k) => va + k).filter(i => i >= 14).map(i => `${x(i)},${ry(rsiRows(R, i).v)}`).join(" ");
    sub += `<line x1="${L}" x2="${QW - Rt}" y1="${top - 6}" y2="${top - 6}" stroke="var(--chart-sep)"/>
      <rect x="${L}" y="${ry(30)}" width="${QW - L - Rt}" height="${ry(0) - ry(30)}" fill="var(--down)" opacity=".08"/><rect x="${L}" y="${ry(100)}" width="${QW - L - Rt}" height="${ry(70) - ry(100)}" fill="var(--up)" opacity=".08"/>
      ${[30, 70].map(v => `<line x1="${L}" x2="${QW - Rt}" y1="${ry(v)}" y2="${ry(v)}" stroke="var(--ink-muted)" stroke-dasharray="3 3"/><text x="${QW - Rt + 8}" y="${ry(v) + 4}" font-size="11.5" fill="var(--chart-axis)">${v}</text>`).join("")}
      <text x="${L + 4}" y="${top + 10}" font-size="11.5" fill="var(--chart-axis)">RSI(14)</text><polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>`;
    if (h2 && q.id === "r2" && ans.length) { const a = ans[0], x0 = x(a - 6) - step / 2, x1 = x(a + 5) + step / 2; sub += `<line x1="${L}" x2="${QW - Rt}" y1="${ry(30)}" y2="${ry(30)}" stroke="var(--brand)" stroke-width="2"/><rect x="${x0}" y="${top}" width="${x1 - x0}" height="${RH}" fill="var(--brand)" opacity=".12" rx="3"/>`; }
  }
  // 날을 고르는 문제: 캔들마다 세로 전체를 누를 수 있게
  const hits = q.kind === "tap" && !done ? V.map((r, k) => { const i = va + k; return `<rect x="${x(i) - step / 2}" y="${T - 4}" width="${step}" height="${H - T - 20}" fill="transparent" style="cursor:pointer" data-act="cq-tap" data-i="${i}"><title>${esc(krDate(r[0]))}</title></rect>`; }).join("") : "";
  return `<svg viewBox="0 0 ${QW} ${H}" class="qchart" role="img" aria-label="${esc(o.chart.name)} ${esc(o.chart.iv)} 차트">${g}${extra}${cs}${sub}${hits}</svg>`;
}

export type CourseFigureOptions = Omit<CourseChartOptions, "chart"> & { chart?: CourseChartData };

/** 문제 그림: diagram(캔들 두 개)·volbars(거래량 막대)·rsibars(14일 변화)·per(계산식) 또는 캔들 차트 */
export function renderCourseFigure(o: CourseFigureOptions) {
  const q = sanitizeCourseQuestion(o.q), f = q.fig, done = o.state.checked, QW = widthOf(o.width);
  if (f.type === "diagram") {
    const Yd = (p: number) => 14 + (100 - p) / 100 * 150;
    return `<svg viewBox="0 0 ${QW} 190" class="qchart">${candleFig(QW * .3, 28, 96, 6, 74, Yd, ["고가", "시가", "종가", "저가"])}${candleFig(QW * .65, 74, 96, 6, 28, Yd, ["고가", "시가", "종가", "저가"])}
      <text x="${QW * .3}" y="184" font-size="13" font-weight="600" fill="var(--up)" text-anchor="middle">빨간 캔들</text><text x="${QW * .65}" y="184" font-size="13" font-weight="600" fill="var(--down)" text-anchor="middle">파란 캔들</text></svg>`;
  }
  if (f.type === "volbars" && o.chart && f.day) {
    const R = o.chart.rows, i = rowIndexOf(R, f.day), W = R.slice(i - 20, i + 1), av = W.slice(0, 20).reduce((a, r) => a + r[5], 0) / 20, mx = Math.max(...W.map(r => r[5])), bw = (QW - 20) / 21, Y = (v: number) => 196 - v / mx * 176;
    return `<svg viewBox="0 0 ${QW} 220" class="qchart">${W.map((r, k) => `<rect x="${10 + k * bw + bw * .15}" y="${Y(r[5])}" width="${bw * .7}" height="${196 - Y(r[5])}" rx="2" fill="${k === 20 ? "var(--brand)" : "var(--muted-soft)"}" opacity="${k === 20 ? 1 : .55}"/>`).join("")}
      <line x1="10" x2="${QW - 10 - bw}" y1="${Y(av)}" y2="${Y(av)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/><text class="halo" x="14" y="${Y(av) - 6}" font-size="12" fill="var(--ink)">20일 평균</text>
      ${o.state.hint >= 2 && !done ? (() => { const u = 196 - Y(av), bx = 10 + 20 * bw + bw * .15, k = Math.floor(W[20][5] / av); return Array.from({ length: k }, (_, j) => `<rect x="${bx}" y="${196 - (j + 1) * u}" width="${bw * .7}" height="${u}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 3"/>`).join(""); })() : ""}
      <text x="10" y="214" font-size="11.5" fill="var(--chart-axis)">${esc(R[i - 20][0].slice(5).replace("-", "/"))}</text><text x="${QW - 10}" y="214" font-size="11.5" font-weight="700" fill="var(--brand)" text-anchor="end">5/25</text></svg>`;
  }
  if (f.type === "rsibars" && o.chart) {
    const R = o.chart.rows, D = R.slice(1).map((r, k) => r[4] - R[k][4]), mx = Math.max(...D.map(Math.abs)), bw = (QW - 20) / 14, P = rsiRows(R);
    return `<svg viewBox="0 0 ${QW} 200" class="qchart"><line x1="0" x2="${QW}" y1="96" y2="96" stroke="var(--hairline-strong)"/>
      ${D.map((d, k) => { const h = Math.abs(d) / mx * 80; return `<rect x="${10 + k * bw + bw * .2}" y="${d > 0 ? 96 - h : 96}" width="${bw * .6}" height="${Math.max(1.5, h)}" rx="2" fill="${d > 0 ? "var(--up)" : "var(--down)"}"/>`; }).join("")}
      <text x="10" y="194" font-size="11.5" fill="var(--chart-axis)">1/30</text><text x="${QW - 10}" y="194" font-size="11.5" fill="var(--chart-axis)" text-anchor="end">2/19</text></svg>
      ${done ? `<div class="ratio"><span style="width:${P.v}%" class="u">오른 쪽 ${P.v.toFixed(1)}%</span><span class="d">${(100 - P.v).toFixed(1)}%</span></div>` : ""}`;
  }
  if (f.type === "per") return `<div class="eq big"><span><b>$100</b><small>주가</small></span>÷<span><b>$5</b><small>1주당 1년 이익</small></span>=<span><b>${done ? "20배" : "?"}</b><small>PER</small></span></div>
    ${done ? `<div class="cells">${Array.from({ length: 20 }, () => "<i></i>").join("")}</div><p class="cap">칸 하나가 1년치 이익($5)이에요. 20칸을 모아야 주가 $100이 돼요.</p>` : ""}`;
  if (!o.chart) return "";
  return renderCourseChart({ ...o, q, chart: o.chart });
}

export type CourseSourceInfo = { name: string; sym: string; iv: string; from: string; to: string; partial: boolean; split?: string };

/** 문제 아래 출처: 문자열로 합치지 않은 구조 데이터 */
export function courseSourceInfo(c: CourseChartData, view?: [number, number]): CourseSourceInfo {
  const R = c.rows, [va, vb] = view ?? [0, R.length - 1];
  return { name: String(c.name), sym: String(c.sym), iv: String(c.iv), from: String(R[va]?.[0] ?? ""), to: String(R[vb]?.[0] ?? ""), partial: va > 0 || vb < R.length - 1, split: c.split ? String(c.split) : undefined };
}
/** 출처 한 줄을 평문으로. 텍스트 전용: textContent 나 React 텍스트로만 넣는다 (innerHTML 금지) */
export function courseSourceText(s: CourseSourceInfo) {
  return `${s.name}(${s.sym}) ${s.iv}, ${s.from.replace(/-/g, ".")}~${s.to.replace(/-/g, ".")}${s.partial ? " (문제에 필요한 구간만)" : ""}. 출처 Yahoo Finance${s.split ? `. 가격은 ${s.split}을 반영한 값이라 당시 화면의 가격과 달라요` : ""}.`;
}
/** 출처 한 줄 (HTML 안전). 이스케이프돼 있어 innerHTML 로 넣어도 된다. 텍스트로 넣을 때는 courseSourceText 를 쓴다 */
export function courseSource(c: CourseChartData, view?: [number, number]) {
  return esc(courseSourceText(courseSourceInfo(c, view)));
}

/** 가격을 고르는 영역(data-act="cq-level")을 누른 자리 → 가격 (목업 cq-level 처리) */
export function levelFromClick(el: SVGElement, clientY: number) {
  const svg = (el as SVGGraphicsElement).ownerSVGElement; if (!svg) return null;
  const r = svg.getBoundingClientRect(), d = el.dataset, yv = (clientY - r.top) * +(d.qw ?? 0) / r.width;
  return +(d.hi ?? 0) - (yv - +(d.t ?? 0)) / +(d.ph ?? 1) * (+(d.hi ?? 0) - +(d.lo ?? 0));
}

/** 날을 눌렀을 때 다음 고른 날 목록 (목업 cq-tap 처리): 하나만 고르는 문제면 바꿔 치고, 여럿이면 끄고 켠다 */
export function toggleTap(q: CourseQuestion, sel: number[], i: number) {
  const one = (q.count || tapAnswers(q).length) === 1;
  return sel.includes(i) ? sel.filter(x => x !== i) : one ? [i] : [...sel, i];
}

/** 정답 판정 (목업 qCorrect) */
export function isCorrect(q: CourseQuestion, s: CourseAnswerState) {
  if (q.kind === "choice") return s.choice === q.ans;
  if (q.kind === "level") { if (!q.band) return false; const [a, b] = q.band(); return s.level != null && s.level >= a && s.level <= b; }
  const ans = tapAnswers(q), tol = q.tol || 0;
  return s.sel.length === ans.length && s.sel.every(i => ans.some(a => Math.abs(a - i) <= tol)) && ans.every(a => s.sel.some(i => Math.abs(a - i) <= tol));
}
