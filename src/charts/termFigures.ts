/* 용어 카드 그림. 목업 gops.js의 gauge/pastLine/candleFig/지지·저항 20일 캔들/miniSpark/monthLine 을 문자열을 돌려주는 순수 함수로 */
import { fx1, md, rng } from "./format";
import type { Bar } from "./types";

/** 용어 카드 그림의 기준 폭 */
export const CW = 372;

export type GaugeZone = [number, number, string, string?];

/** 눈금 막대 위에 지금 값을 화살표로. zones는 [시작, 끝, 색, 이름?], ticks는 눈금 숫자 */
export function gauge(v: number, max: number, zones: GaugeZone[], ticks: number[], fmt: (v: number) => string = fx1) {
  const X = (p: number) => 6 + Math.min(Math.max(p, 0), max) / max * (CW - 12);
  return `<svg viewBox="0 0 ${CW} 58" class="mini">
    <rect x="6" y="22" width="${CW - 12}" height="8" rx="4" fill="var(--control)"/>
    ${zones.map(([a, b, c]) => `<rect x="${X(a)}" y="22" width="${X(b) - X(a)}" height="8" fill="${c}" opacity=".28"/>`).join("")}
    ${zones.map(([a, b, , t]) => t ? `<text x="${(X(a) + X(b)) / 2}" y="46" font-size="11" fill="var(--ink-muted)" text-anchor="middle">${t}</text>` : "").join("")}
    ${ticks.map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="20" y2="32" stroke="var(--ink-muted)"/><text x="${X(t)}" y="57" font-size="10.5" fill="var(--muted-soft)" text-anchor="middle">${t}</text>`).join("")}
    <path d="M${X(v) - 6} 8 h12 l-6 9 z" fill="var(--ink)"/><text x="${X(v)}" y="6" font-size="11.5" font-weight="700" fill="var(--ink)" text-anchor="middle">${fmt(v)}</text>
  </svg>`;
}

/** 지난 종가 선 위에 조건에 맞는 날을 점으로. marks는 [막대 번호, 색] */
export function pastLine(C: Pick<Bar, "t" | "c">[], marks: [number, string][]) {
  const H = 78, lo = Math.min(...C.map(d => d.c)), hi = Math.max(...C.map(d => d.c));
  const X = (i: number) => 4 + i / (C.length - 1) * (CW - 8), Y = (p: number) => 6 + (hi - p) / (hi - lo || 1) * (H - 22);
  return `<svg viewBox="0 0 ${CW} ${H}" class="mini">
    <polyline points="${C.map((d, i) => `${X(i)},${Y(d.c)}`).join(" ")}" fill="none" stroke="var(--muted-soft)" stroke-width="1.5"/>
    ${marks.map(([i, col]) => `<circle cx="${X(i)}" cy="${Y(C[i].c)}" r="3.2" fill="${col}"/>`).join("")}
    <text x="4" y="${H - 2}" font-size="10.5" fill="var(--muted-soft)">${md(C[0].t)}</text><text x="${CW - 4}" y="${H - 2}" font-size="10.5" fill="var(--muted-soft)" text-anchor="end">${md(C[C.length - 1].t)}</text>
  </svg>`;
}

/** 캔들 하나. 왼쪽(side=-1) 또는 오른쪽(side=1)에 네 가격 이름표 [고가, 시가, 종가, 저가]. svg 안에 넣을 조각을 돌려준다 */
export function candleFig(x: number, o: number, h: number, l: number, c: number, Y: (p: number) => number, labels: [string, string, string, string], side = 1) {
  const up = c >= o, col = up ? "var(--up)" : "var(--down)", top = Y(Math.max(o, c)), bot = Y(Math.min(o, c));
  const at = [Y(h), top, bot, Y(l)], ty = at.reduce<number[]>((a, v, i) => a.concat(i ? Math.max(v, a[i - 1] + 15) : v), []);
  const txt = [labels[0], up ? labels[2] : labels[1], up ? labels[1] : labels[2], labels[3]];
  const tag = (i: number) => `<polyline points="${x + side * 14},${at[i]} ${x + side * 24},${at[i]} ${x + side * 30},${ty[i]}" fill="none" stroke="var(--muted-soft)"/><text x="${x + side * 34}" y="${ty[i] + 4}" font-size="11.5" fill="var(--ink)" text-anchor="${side > 0 ? "start" : "end"}">${txt[i]}</text>`;
  return `<line x1="${x}" x2="${x}" y1="${Y(h)}" y2="${Y(l)}" stroke="${col}" stroke-width="2"/><rect x="${x - 11}" y="${top}" width="22" height="${Math.max(2, bot - top)}" fill="${col}" rx="1.5"/>
    ${[0, 1, 2, 3].map(tag).join("")}`;
}

/** 캔들 카드 '모양 익히기': 양봉·음봉 견본 */
export function candleShapes() {
  const Yd = (p: number) => 18 + (100 - p) / 100 * 112;
  return `<svg viewBox="0 0 ${CW} 150" class="mini">
            ${candleFig(40, 30, 98, 4, 72, Yd, ["고가", "시가", "종가", "저가"])}
            ${candleFig(226, 72, 98, 4, 30, Yd, ["고가", "시가", "종가", "저가"])}
            <text x="16" y="148" font-size="12" font-weight="600" fill="var(--up)">양봉: 시작보다 높게 끝남</text>
            <text x="202" y="148" font-size="12" font-weight="600" fill="var(--down)">음봉: 시작보다 낮게 끝남</text>
          </svg>`;
}

/** 캔들 카드 '마지막 날': 실제 막대 하나를 네 가격 이름표와 함께 */
export function lastDayCandle(d: Bar, fmt: (v: number) => string) {
  const lo = d.l * 0.998, hi = d.h * 1.002, Yr = (p: number) => 18 + (hi - p) / (hi - lo) * 112;
  return `<svg viewBox="0 0 ${CW} 140" class="mini">${candleFig(60, d.o, d.h, d.l, d.c, Yr, [`고가 ${fmt(d.h)}`, `시가 ${fmt(d.o)}`, `종가 ${fmt(d.c)}`, `저가 ${fmt(d.l)}`])}</svg>`;
}

/** 지지선·저항선 카드: 최근 20거래일 캔들 위에 지지(노랑)·저항(보라) 선과 지지선에 닿은 날 동그라미. touches는 W(20개) 안의 번호 */
export function supResStrip(W: Bar[], sup: number, res: number, touches: number[]) {
  const lo = Math.min(sup, ...W.map(d => d.l)) * 0.995, hi = Math.max(res, ...W.map(d => d.h)) * 1.005, Y = (p: number) => 10 + (hi - p) / (hi - lo) * 170, bw = (CW - 70) / 20;
  return `<svg viewBox="0 0 ${CW} 192" class="mini">
          ${W.map((d, i) => { const x = 4 + i * bw + bw / 2, col = d.c >= d.o ? "var(--up)" : "var(--down)"; return `<line x1="${x}" x2="${x}" y1="${Y(d.h)}" y2="${Y(d.l)}" stroke="${col}"/><rect x="${x - bw * .3}" y="${Y(Math.max(d.o, d.c))}" width="${bw * .6}" height="${Math.max(1, Math.abs(Y(d.o) - Y(d.c)))}" fill="${col}"/>`; }).join("")}
          ${touches.map(i => `<circle cx="${4 + i * bw + bw / 2}" cy="${Y(W[i].l)}" r="5" fill="none" stroke="var(--yellow)" stroke-width="2"/>`).join("")}
          <line x1="0" x2="${CW - 66}" y1="${Y(sup)}" y2="${Y(sup)}" stroke="var(--yellow)" stroke-width="1.6"/><text x="${CW - 62}" y="${Y(sup) + 4}" font-size="11" fill="var(--ink)">지지 ${sup.toFixed(2)}</text>
          <line x1="0" x2="${CW - 66}" y1="${Y(res)}" y2="${Y(res)}" stroke="var(--purple)" stroke-width="1.6" stroke-dasharray="5 4"/><text x="${CW - 62}" y="${Y(res) + 4}" font-size="11" fill="var(--ink)">저항 ${res.toFixed(2)}</text>
        </svg>`;
}

/** 지지선에 닿은 날: 최근 12거래일 중 저가가 지지선 근처(0.4% 안)까지 내려온 날의 번호 (C 기준) */
export const supportTouches = (C: Bar[], sup: number) => { const n = C.length; return C.map((_, i) => i).filter(i => i >= n - 12 && C[i].l <= sup * 1.004); };

/** 추세 카드: 종가 선 위에 최근 고점 3개(빨강)·저점 3개(파랑)를 점선으로 잇는다 */
export function trendLine(C: Bar[], hiIdx: number[], loIdx: number[]) {
  const n = C.length, H3 = hiIdx.slice(-3), L3 = loIdx.slice(-3);
  const mn = Math.min(...C.map(d => d.l)), mx = Math.max(...C.map(d => d.h)), X = (i: number) => 4 + i / (n - 1) * (CW - 8), Y = (p: number) => 6 + (mx - p) / (mx - mn) * 100;
  return `<svg viewBox="0 0 ${CW} 124" class="mini">
          <polyline points="${C.map((d, i) => `${X(i)},${Y(d.c)}`).join(" ")}" fill="none" stroke="var(--muted-soft)" stroke-width="1.5"/>
          <polyline points="${H3.map(i => `${X(i)},${Y(C[i].h)}`).join(" ")}" fill="none" stroke="var(--up)" stroke-dasharray="4 3"/><polyline points="${L3.map(i => `${X(i)},${Y(C[i].l)}`).join(" ")}" fill="none" stroke="var(--down)" stroke-dasharray="4 3"/>
          ${H3.map(i => `<circle cx="${X(i)}" cy="${Y(C[i].h)}" r="3.5" fill="var(--up)"/>`).join("")}${L3.map(i => `<circle cx="${X(i)}" cy="${Y(C[i].l)}" r="3.5" fill="var(--down)"/>`).join("")}
          <text x="4" y="122" font-size="10.5" fill="var(--muted-soft)">${md(C[0].t)}</text><text x="${CW - 4}" y="122" font-size="10.5" fill="var(--muted-soft)" text-anchor="end">${md(C[n - 1].t)}</text>
        </svg>`;
}

/** 홈 시세 카드의 작은 선. seed가 같으면 같은 모양, shape "spike"는 끝에서 치솟는 꼴 */
export function miniSpark(seed: number, up: boolean, shape?: "spike") {
  const r = rng(seed), W = 64, H = 36, N = 40; let v = 0; const raw: number[] = [];
  for (let i = 0; i < N; i++) { v += (r() - 0.5) * 2 + (shape === "spike" ? (i > N - 8 ? 2.6 : -0.05) : up ? 0.32 : -0.32); raw.push(v); }
  const lo = Math.min(...raw), hi = Math.max(...raw), y = (x: number) => (H - 5 - (x - lo) / (hi - lo || 1) * (H - 10)).toFixed(1);
  const pts = raw.map((x, i) => `${(i * (W - 4) / (N - 1)).toFixed(1)},${y(x)}`), [ex, ey] = pts[N - 1].split(",");
  const col = up ? "var(--up)" : "var(--down)", id = "mg" + seed;
  return `<svg class="msp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <path d="M0,${H} L${pts.join(" L")} L${ex},${H} Z" fill="url(#${id})"/><polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="${ex}" cy="${ey}" r="5" fill="${col}" opacity=".18"/><circle cx="${ex}" cy="${ey}" r="2.4" fill="${col}"/></svg>`;
}

/** 지난 한 달(22거래일) 종가 선. 점선은 한 달 전 가격 */
export function monthLine(C: Pick<Bar, "c">[]) {
  const D = C.slice(-22).map(d => d.c), W = 120, H = 40, lo = Math.min(...D), hi = Math.max(...D);
  const x = (i: number) => 2 + i / (D.length - 1) * (W - 6), y = (v: number) => 4 + (hi - v) / (hi - lo || 1) * (H - 8), last = D[D.length - 1], up = last >= D[0];
  return `<svg class="aq-month" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(D[0])}" y2="${y(D[0])}" stroke="var(--hairline-strong)" stroke-dasharray="3 3"/>
    <polyline points="${D.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--${up ? "up" : "down"})" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(D.length - 1)}" cy="${y(last)}" r="3.5" fill="var(--${up ? "up" : "down"})"/></svg>`;
}
