/* 지표 계산. 목업 gops.js의 cxSma/cxAtr/rsiParts/rsiWilder/rsiRows/cxAgg 와 cxBars의 하이킨아시·렌코·카기 변환 */
import type { Bar, CourseRow, Interval, PlotBar } from "./types";

export const RSI_N = 14;

/** 단순 이동평균. 앞 n-1개는 null */
export const sma = (A: number[], n: number): (number | null)[] => {
  const out: (number | null)[] = new Array(A.length).fill(null); let s = 0;
  for (let i = 0; i < A.length; i++) { s += A[i]; if (i >= n) s -= A[i - n]; if (i >= n - 1) out[i] = s / n; }
  return out;
};

/** 최근 n개 막대의 평균 참범위 (렌코·카기 한 칸 크기) */
export const atr = (A: Bar[], n = 14) => {
  const B = A.slice(-n - 1); let a = 0;
  for (let i = 1; i < B.length; i++) a += Math.max(B[i].h - B[i].l, Math.abs(B[i].h - B[i - 1].c), Math.abs(B[i].l - B[i - 1].c));
  return a / Math.max(1, B.length - 1);
};

/** 전날 종가 대비 오르내린 폭으로 계산하는 단순 RSI. 날짜별 변화(days)도 같이 돌려준다 */
export function rsiParts(C: Bar[], end = C.length - 1, n = RSI_N) {
  const days: { t: Date; d: number }[] = [];
  for (let i = end - n + 1; i <= end; i++) days.push({ t: C[i].t, d: C[i].c - C[i - 1].c });
  const up = days.reduce((a, x) => a + Math.max(x.d, 0), 0), down = days.reduce((a, x) => a + Math.max(-x.d, 0), 0);
  return { days, up, down, v: 100 * up / (up + down || 1) };
}
export const rsiSeries = (C: Bar[], n = RSI_N) => C.map((_, i) => (i < n ? null : rsiParts(C, i, n).v));

/** 와일더 방식: 오래된 날의 비중을 조금씩 줄여 평균 낸다 */
export function rsiWilder(C: Bar[], n = RSI_N) {
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = C[i].c - C[i - 1].c; if (d > 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let i = n + 1; i < C.length; i++) { const d = C[i].c - C[i - 1].c; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  return 100 * g / (g + l);
}

/** 코스 문제 차트 줄([날짜,o,h,l,c,v]) 기준 14일 단순 RSI */
export function rsiRows(R: CourseRow[], end = R.length - 1) {
  let up = 0, down = 0;
  for (let i = end - 13; i <= end; i++) { const d = R[i][4] - R[i - 1][4]; if (d > 0) up += d; else down -= d; }
  return { up, down, v: 100 * up / (up + down || 1) };
}

/** 하이킨아시: 평균 낸 캔들 */
export function heikinAshi(base: Bar[]): Bar[] {
  const out: Bar[] = [];
  base.forEach((x, i) => { const c = (x.o + x.h + x.l + x.c) / 4, o = i ? (out[i - 1].o + out[i - 1].c) / 2 : (x.o + x.c) / 2; out.push({ ...x, o, c, h: Math.max(x.h, o, c), l: Math.min(x.l, o, c) }); });
  return out;
}

/** 렌코: 종가가 box 만큼 움직일 때마다 한 칸 */
export function renko(B: Bar[], box: number): PlotBar[] {
  const out: PlotBar[] = []; if (!B.length) return out;
  let top = B[0].c, bot = B[0].c;
  for (const x of B) {
    while (x.c >= top + box) { out.push({ t: x.t, o: top, c: top + box, h: top + box, l: top, v: x.v }); bot = top; top += box; }
    while (x.c <= bot - box) { out.push({ t: x.t, o: bot, c: bot - box, h: bot, l: bot - box, v: x.v }); top = bot; bot -= box; }
  }
  return out;
}

/** 카기: 반대로 box만큼 움직이면 방향을 바꾼다. 앞 고점을 넘으면 굵은 선(양), 앞 저점을 깨면 가는 선(음) */
export function kagi(B: Bar[], box: number): PlotBar[] {
  const out: PlotBar[] = []; if (!B.length) return out;
  let dir = 0, start = B[0].c, ext = B[0].c, yang = true, lastHi = -Infinity, lastLo = Infinity;
  const push = (t: Date, up: boolean) => { if (up && ext > lastHi) yang = true; if (!up && ext < lastLo) yang = false; out.push({ t, o: start, c: ext, h: Math.max(start, ext), l: Math.min(start, ext), v: 0, up, yang }); if (up) lastHi = ext; else lastLo = ext; start = ext; };
  for (const x of B) {
    if (dir >= 0 && x.c > ext && (dir || x.c >= ext + box)) { ext = x.c; dir = 1; }
    else if (dir <= 0 && x.c < ext && (dir || x.c <= ext - box)) { ext = x.c; dir = -1; }
    else if (dir === 1 && x.c <= ext - box) { push(x.t, true); ext = x.c; dir = -1; }
    else if (dir === -1 && x.c >= ext + box) { push(x.t, false); ext = x.c; dir = 1; }
  }
  if (dir) push(B[B.length - 1].t, dir > 0);
  return out;
}

/** 막대 묶기: keyOf가 같은 막대끼리 한 막대로 */
export function aggregate(rows: Bar[], keyOf: (t: Date) => string | number): Bar[] {
  const out: Bar[] = []; let cur: Required<Bar> | null = null, k0: string | number | null = null;
  for (const x of rows) {
    const k = keyOf(x.t);
    if (k !== k0 || !cur) { cur = { t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: 0, short: 0, inst: 0, foreign: 0, retail: 0 }; out.push(cur); k0 = k; }
    cur.h = Math.max(cur.h, x.h); cur.l = Math.min(cur.l, x.l); cur.c = x.c; cur.v += x.v;
    cur.short += x.short ?? 0; cur.inst += x.inst ?? 0; cur.foreign += x.foreign ?? 0; cur.retail += x.retail ?? 0;
  }
  return out;
}
/** 주 단위 키: 그 주 월요일 */
export const weekKey = (t: Date) => { const m = new Date(t); m.setDate(t.getDate() - (t.getDay() + 6) % 7); return m.toDateString(); };
export const monthKey = (t: Date) => t.getFullYear() * 12 + t.getMonth();
export const yearKey = (t: Date) => t.getFullYear();
/** N분 키: 09:30 개장 기준으로 n분씩 묶는다 */
export const minuteKey = (n: number) => (t: Date) => t.toDateString() + Math.floor(((t.getHours() - 9) * 60 + t.getMinutes() - 30) / n);

export const CX_IV: Record<Interval, [string, number]> = { "1m": ["1분", 1], "3m": ["3분", 3], "5m": ["5분", 5], "10m": ["10분", 10], "15m": ["15분", 15], "30m": ["30분", 30], "60m": ["60분", 60], D: ["일", 0], W: ["주", 0], M: ["월", 0], Y: ["년", 0] };
export const CX_MIN: Interval[] = ["1m", "3m", "5m", "10m", "15m", "30m", "60m"];
export const isIntra = (iv: Interval) => CX_MIN.includes(iv);

/** 일봉·1분봉에서 주기별 막대를 만든다 (목업 cxSeries). 분 주기는 minute, 일·주·월·년은 daily 에서 */
export function seriesOf(iv: Interval, daily: Bar[], minute: Bar[] = []): Bar[] {
  if (iv === "D") return daily;
  if (iv === "1m") return minute;
  const n = CX_IV[iv][1];
  if (n) return aggregate(minute, minuteKey(n));
  return aggregate(daily, iv === "W" ? weekKey : iv === "M" ? monthKey : yearKey);
}

/** 지금 모양으로 그릴 막대 (목업 cxBars). 렌코·카기는 최근 400개만 쓰고 한 칸 크기(box)를 같이 돌려준다 */
export function plotBars(base: Bar[], type: string): { bars: PlotBar[]; box: number } {
  if (type === "heikin") return { bars: heikinAshi(base), box: 0 };
  if (type !== "renko" && type !== "kagi") return { bars: base, box: 0 };
  const B = base.slice(-400), box = atr(B);
  return { bars: type === "renko" ? renko(B, box) : kagi(B, box), box };
}
