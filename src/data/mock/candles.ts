/* 결정적 캔들 생성기. 목업 gops.js 184~216, 638~646, 1053~1059, 2274~2343줄을 그대로 옮겼다.
   같은 종목·주기면 늘 같은 값이 나와야 화면이 목업과 같다. 숫자 하나도 바꾸지 말 것. */
import type { Candle } from "../../api/types";
import { S } from "./symbols";
import { rng } from "../../charts/format";
import { CX_IV, seriesOf } from "../../charts/indicators";
import type { Interval } from "../../charts/types";

export { rng };
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
export { CX_IV };   // 주기 표는 차트 모듈(src/charts/indicators.ts)이 원본
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
/* 묶음 주기(3분·5분·주·월·년)와 하이킨아시·렌코·카기 변환은 차트 모듈(src/charts/indicators.ts seriesOf·plotBars)이 맡는다.
   여기서는 일봉·1분봉 생성만 하고, 묶음은 캐시해 둔다 */
const SERIES_CACHE: Record<string, Candle[]> = {};
export function cxSeries(s: string, iv: string): Candle[] {
  if (iv === "D") return cxDaily(s);
  if (iv === "1m") return cxMinute(s);
  const k = s + ":" + iv; if (SERIES_CACHE[k]) return SERIES_CACHE[k];
  const intra = CX_IV[iv as Interval][1] > 0;
  return SERIES_CACHE[k] = seriesOf(iv as Interval, cxDaily(s), intra ? cxMinute(s) : []);
}
/* 실시간 가격이 움직이면 일봉·1분봉 마지막 막대에 반영하고, 그걸로 묶은 주기는 다시 묶게 지운다 */
export function cxLive(s: string, price: number): void {
  for (const k of [s + ":D", s + ":1m"]) { const A = CX_CACHE[k]; if (!A) continue; const b = A[A.length - 1]; b.c = price; b.h = Math.max(b.h, price); b.l = Math.min(b.l, price); }
  Object.keys(SERIES_CACHE).forEach(k => { if (k.startsWith(s + ":")) delete SERIES_CACHE[k]; });
}
