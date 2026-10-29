/* 결정적 캔들 생성기. 목업 gops.js 184~216, 638~646, 1053~1059, 2274~2343줄을 그대로 옮겼다.
   같은 종목·주기면 늘 같은 값이 나와야 화면이 목업과 같다. 숫자 하나도 바꾸지 말 것. */
import type { Candle } from "../../api/types";
import { S } from "./symbols";

export function rng(a: number): () => number {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/* NVDA는 대화와 규칙에 나오는 숫자(지지 137.70, 저항 150, 거래량 2.1배)에 맞춰 고정 */
export const SUP = 137.70, RES = 150;
export const r2 = (v: number): number => Math.round(v * 100) / 100;
export const symSeed = (s: string): number => [...s].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
export const LAST_DAY = new Date(2026, 8, 30);   // 캔들 마지막 거래일. 뉴스의 'N시간 전', '어제'는 이 날 기준

const CANDLE_CACHE: Record<string, Candle[]> = {};
/* 종목마다 다른 캔들. 마지막 봉은 S의 현재가와 등락률에 맞춘다 */
export function candlesOf(s: string): Candle[] {
  if (CANDLE_CACHE[s]) return CANDLE_CACHE[s];
  const nv = s === "NVDA", st = S[s], seed = nv ? 11 : symSeed(s), drift = nv ? 0.0029 : (seed % 7 - 2) * 0.0008;
  const r = rng(seed), n = 84, out: Candle[] = []; let p = 112;
  for (let i = 0; i < n; i++) {
    const o = p, c = o * (1 + drift + (r() - 0.5) * 0.034);
    out.push({ t: new Date(0), o, c, h: Math.max(o, c) * (1 + r() * 0.011), l: Math.min(o, c) * (1 - r() * 0.011), v: 150 + r() * 110 }); p = c;
  }
  const open = r2(st.p / (1 + st.d / 100));
  const k = open / out[n - 2].c; out.forEach(d => { d.o *= k; d.c *= k; d.h *= k; d.l *= k; });
  const av = out.slice(-21, -1).reduce((a, d) => a + d.v, 0) / 20;
  out[n - 1] = { t: new Date(0), o: open, h: r2(Math.max(open, st.p) * 1.0056), l: r2(Math.min(open, st.p) * 0.9932), c: st.p, v: av * (nv ? 2.1 : 0.7 + Math.abs(st.d) * 0.3) };
  const d = new Date(2026, 8, 30);
  for (let i = n - 1; i >= 0; i--) { out[i].t = new Date(d); do d.setDate(d.getDate() - 1); while (d.getDay() % 6 === 0); }
  return CANDLE_CACHE[s] = out;
}
/* 지지선은 최근 12거래일 중 가장 낮은 가격, 저항선은 기간 최고가보다 조금 위 */
export function levelsOf(s: string): { sup: number; res: number } {
  if (s === "NVDA") return { sup: SUP, res: RES };
  const C = candlesOf(s);
  return { sup: r2(Math.min(...C.slice(-12).map(d => d.l))), res: Math.round(Math.max(...C.map(d => d.h)) * 1.03) };
}
/* 오늘 거래량이 최근 20일 평균의 몇 배인지 */
export const volX = (s: string): number => { const C = candlesOf(s); return C[C.length - 1].v / (C.slice(-21, -1).reduce((a, d) => a + d.v, 0) / 20); };
export const prevClose = (s: string): number => S[s].p / (1 + S[s].d / 100);
export const tickStep = (p: number): number => p >= 500 ? 0.05 : 0.01;

/* 종목의 기간 등락(%). 1주·1개월은 목업 값: 같은 종목·기간이면 늘 같은 값 */
export function mapChg(s: string, d: number, p: string): number {
  if (!p) return d;
  const r = rng(symSeed(s) + (p === "1w" ? 101 : 102));
  return Math.round((p === "1w" ? d * 1.4 + (r() - 0.45) * 7 : d * 2 + (r() - 0.42) * 16) * 100) / 100;
}

/* 지난 4달을 한 달(21거래일) 단위로 끊어 본 변동 폭. 보통(절댓값 중앙값)·가장 크게 내린 달·가장 크게 오른 달·최근 한 달 */
export function swingOf(s: string): { typical: number; worst: number; best: number; month: number; monthAgo: number } {
  const C = candlesOf(s), rets: number[] = [];
  for (let i = 21; i < C.length; i++) rets.push((C[i].c / C[i - 21].c - 1) * 100);
  const abs = rets.map(Math.abs).sort((a, b) => a - b);
  return { typical: abs[Math.floor(abs.length / 2)], worst: Math.min(...rets), best: Math.max(...rets), month: rets[rets.length - 1], monthAgo: C[C.length - 22].c };
}

/* ---------- 차트 모듈 데이터: 일봉 2016년부터, 분봉 5일, 묶음 주기 ---------- */
export const CX_IV: Record<string, [label: string, minutes: number]> = { "1m": ["1분", 1], "3m": ["3분", 3], "5m": ["5분", 5], "10m": ["10분", 10], "15m": ["15분", 15], "30m": ["30분", 30], "60m": ["60분", 60], D: ["일", 0], W: ["주", 0], M: ["월", 0], Y: ["년", 0] };
export const VOL_K = 1e6;   // candlesOf 거래량 1 = 100만 주
const CX_CACHE: Record<string, Candle[]> = {};
/* 투자자별 흐름(가짜): 공매도는 거래량의 18~40%, 기관·외국인은 그날 등락과 조금 같은 방향, 개인은 둘의 반대 */
export function cxFlows(x: Candle, r: () => number): void {
  const v = x.v * VOL_K, ret = x.c / x.o - 1;
  x.short = v * (0.18 + r() * 0.22); x.inst = v * ((r() - 0.5) * 0.16 + ret * 2); x.foreign = v * ((r() - 0.5) * 0.2 + ret * 3); x.retail = -(x.inst + x.foreign);
}
export function cxDaily(s: string): Candle[] {
  const key = s + ":D"; if (CX_CACHE[key]) return CX_CACHE[key];
  const C = candlesOf(s), r = rng(symSeed(s) + 41), back = s === "NVDA" ? 0.0013 : 0.0003 + (symSeed(s) % 5) * 0.0002;
  const pre: Candle[] = [], d = new Date(C[0].t), stop = new Date(2016, 0, 4); let o = C[0].o;
  for (;;) {
    do d.setDate(d.getDate() - 1); while (d.getDay() % 6 === 0);
    if (d < stop) break;
    const c = o * (1 + (r() - 0.5) * 0.006), op = c / (1 + back + (r() - 0.5) * 0.034);
    pre.push({ t: new Date(d), o: op, c, h: Math.max(op, c) * (1 + r() * 0.011), l: Math.min(op, c) * (1 - r() * 0.011), v: 150 + r() * 110 });
    o = op;
  }
  const all = pre.reverse().concat(C.map(x => ({ ...x, t: new Date(x.t) })));
  all.forEach(x => cxFlows(x, r));
  return CX_CACHE[key] = all;
}
/* 분봉: 최근 5거래일. 하루 안의 길은 시가에서 종가로 가는 무작위 길을 그날 고가~저가 안에 맞춘 것.
   마지막 날은 화면의 '실시간 09:42' 에 맞춰 09:42까지만 있다 */
export function cxMinute(s: string): Candle[] {
  const key = s + ":1m"; if (CX_CACHE[key]) return CX_CACHE[key];
  const D = cxDaily(s), days = D.slice(-5), r = rng(symSeed(s) + 77), out: Candle[] = [];
  days.forEach((dd, di) => {
    const N = di === days.length - 1 ? 13 : 390, w = [0];
    for (let k = 1; k <= N; k++) w.push(w[k - 1] + (r() - 0.5));
    const raw = w.map((v, k) => v - w[N] * k / N), mn = Math.min(...raw), mx = Math.max(...raw);
    let p = raw.map(v => dd.l + (v - mn) / (mx - mn || 1) * (dd.h - dd.l));
    const a = dd.o - p[0], b = dd.c - p[N];
    p = p.map((v, k) => Math.min(dd.h, Math.max(dd.l, v + a * (1 - k / N) + b * k / N)));
    const wt = Array.from({ length: N }, (_, k) => 1 + 1.6 * ((k / 390 - 0.5) * 2) ** 2), ws = wt.reduce((x, y) => x + y, 0) * (N < 390 ? 390 / N / 4 : 1);
    for (let k = 0; k < N; k++) {
      const t = new Date(dd.t); t.setHours(9, 30 + k, 0, 0);
      const o = p[k], c = p[k + 1], j = Math.abs(c - o) * 0.6 + (dd.h - dd.l) * 0.004;
      const x: Candle = { t, o, c, h: Math.min(dd.h, Math.max(o, c) + r() * j), l: Math.max(dd.l, Math.min(o, c) - r() * j), v: dd.v * wt[k] / ws };
      cxFlows(x, r); out.push(x);
    }
  });
  return CX_CACHE[key] = out;
}
export function cxAgg(rows: Candle[], keyOf: (t: Date) => string | number): Candle[] {
  const out: Candle[] = []; let cur: Candle | null = null, k0: string | number | null = null;
  for (const x of rows) {
    const k = keyOf(x.t);
    if (k !== k0) { cur = { t: x.t, o: x.o, h: x.h, l: x.l, c: x.c, v: 0, short: 0, inst: 0, foreign: 0, retail: 0 }; out.push(cur); k0 = k; }
    const c = cur!;
    c.h = Math.max(c.h, x.h); c.l = Math.min(c.l, x.l); c.c = x.c; c.v += x.v;
    c.short! += x.short || 0; c.inst! += x.inst || 0; c.foreign! += x.foreign || 0; c.retail! += x.retail || 0;
  }
  return out;
}
const cxWeekKey = (t: Date): string => { const m = new Date(t); m.setDate(t.getDate() - (t.getDay() + 6) % 7); return m.toDateString(); };
export function cxSeries(s: string, iv: string): Candle[] {
  if (iv === "D") return cxDaily(s);
  if (iv === "1m") return cxMinute(s);
  const k = s + ":" + iv; if (CX_CACHE[k]) return CX_CACHE[k];
  const n = CX_IV[iv][1];
  if (n) return CX_CACHE[k] = cxAgg(cxMinute(s), t => t.toDateString() + Math.floor(((t.getHours() - 9) * 60 + t.getMinutes() - 30) / n));
  return CX_CACHE[k] = cxAgg(cxDaily(s), iv === "W" ? cxWeekKey : iv === "M" ? t => t.getFullYear() * 12 + t.getMonth() : t => t.getFullYear());
}
/* 실시간 가격이 움직이면 일봉·1분봉 마지막 막대에 반영하고, 그걸로 묶은 주기는 다시 묶게 지운다 */
export function cxLive(s: string, price: number): void {
  for (const k of [s + ":D", s + ":1m"]) { const A = CX_CACHE[k]; if (!A) continue; const b = A[A.length - 1]; b.c = price; b.h = Math.max(b.h, price); b.l = Math.min(b.l, price); }
  Object.keys(CX_CACHE).forEach(k => { if (k.startsWith(s + ":") && !k.endsWith(":D") && !k.endsWith(":1m")) delete CX_CACHE[k]; });
}
export const cxAtr = (A: Candle[], n = 14): number => { const B = A.slice(-n - 1); let a = 0; for (let i = 1; i < B.length; i++) a += Math.max(B[i].h - B[i].l, Math.abs(B[i].h - B[i - 1].c), Math.abs(B[i].l - B[i - 1].c)); return a / Math.max(1, B.length - 1); };

export type BarType = "candle" | "hollow" | "bar" | "line" | "area" | "heikin" | "renko" | "kagi";
export type KagiBar = Candle & { up: boolean; yang: boolean };
/* 지금 모양으로 그릴 막대. 하이킨아시는 평균 낸 캔들, 렌코·카기는 시간 대신 가격이 일정 폭 움직일 때마다 한 칸.
   목업은 CHS.iv/CHS.type 전역을 읽었는데 여기서는 인수로 받는다. 렌코·카기의 칸 폭(box)은 두 번째 값으로 돌려준다 */
export function cxBars(s: string, iv: string, type: BarType): { bars: Candle[]; box: number | null } {
  const base = cxSeries(s, iv);
  if (type === "heikin") {
    const out: Candle[] = [];
    base.forEach((x, i) => { const c = (x.o + x.h + x.l + x.c) / 4, o = i ? (out[i - 1].o + out[i - 1].c) / 2 : (x.o + x.c) / 2; out.push({ ...x, o, c, h: Math.max(x.h, o, c), l: Math.min(x.l, o, c) }); });
    return { bars: out, box: null };
  }
  if (type !== "renko" && type !== "kagi") return { bars: base, box: null };
  const B = base.slice(-400), box = cxAtr(B), out: Candle[] = [];
  if (type === "renko") {
    let top = B[0].c, bot = B[0].c;
    for (const x of B) {
      while (x.c >= top + box) { out.push({ t: x.t, o: top, c: top + box, h: top + box, l: top, v: x.v }); bot = top; top += box; }
      while (x.c <= bot - box) { out.push({ t: x.t, o: bot, c: bot - box, h: bot, l: bot - box, v: x.v }); top = bot; bot -= box; }
    }
    return { bars: out, box };
  }
  // 카기: 반대로 box만큼 움직이면 방향을 바꾼다. 앞 고점을 넘으면 굵은 선(양), 앞 저점을 깨면 가는 선(음)
  let dir = 0, start = B[0].c, ext = B[0].c, yang = true, lastHi = -Infinity, lastLo = Infinity;
  const push = (t: Date, up: boolean) => { if (up && ext > lastHi) yang = true; if (!up && ext < lastLo) yang = false; const bar: KagiBar = { t, o: start, c: ext, h: Math.max(start, ext), l: Math.min(start, ext), v: 0, up, yang }; out.push(bar); if (up) lastHi = ext; else lastLo = ext; start = ext; };
  for (const x of B) {
    if (dir >= 0 && x.c > ext && (dir || x.c >= ext + box)) { ext = x.c; dir = 1; }
    else if (dir <= 0 && x.c < ext && (dir || x.c <= ext - box)) { ext = x.c; dir = -1; }
    else if (dir === 1 && x.c <= ext - box) { push(x.t, true); ext = x.c; dir = -1; }
    else if (dir === -1 && x.c >= ext + box) { push(x.t, false); ext = x.c; dir = 1; }
  }
  if (dir) push(B[B.length - 1].t, dir > 0);
  return { bars: out, box };
}
export const cxSma = (A: number[], n: number): (number | null)[] => { const out: (number | null)[] = new Array(A.length).fill(null); let s = 0; for (let i = 0; i < A.length; i++) { s += A[i]; if (i >= n) s -= A[i - n]; if (i >= n - 1) out[i] = s / n; } return out; };
