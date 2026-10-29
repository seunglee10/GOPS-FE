/* 종목 지표·실적일·차트 이벤트. 목업 gops.js 969~1016, 1223줄 */
import type { ChartEvent, UpcomingEvent } from "../../api/types";
import { S, FX } from "./symbols";
import { candlesOf, rng, symSeed, volX, LAST_DAY } from "./candles";
import { NEWS, newsDay } from "./news";
import { WHY } from "./symbols";

export type Facts = { capB: number; capKrwJo: number; per: number; sper: number; lo: number; hi: number; vol: string; x: number };
/* 오른쪽 핵심 지표. NVDA는 대화에 나오는 숫자에 맞춰 고정, 나머지는 캔들에서 계산한 가짜 값.
   목업은 시가총액을 문자열로 만들어 돌려줬는데(bigMoney·krw), 여기서는 숫자(십억 달러, 조 원)로 두고 화면에서 표기한다 */
export function factsOf(s: string): Facts {
  const st = S[s], C = candlesOf(s), x = volX(s);
  const capB = st.cap, capKrwJo = st.cap * FX / 1000;
  if (s === "NVDA") return { capB, capKrwJo, per: 34.2, sper: 28.1, lo: 90.7, hi: 144.4, vol: "4.12억 주", x };
  const r = rng(symSeed(s) + 1), hi = Math.max(...C.map(d => d.h)) * (1 + r() * 0.06), lo = Math.min(...C.map(d => d.l)) * (0.78 + r() * 0.12);
  const man = Math.round((300 + r() * 5000) * x);
  return { capB, capKrwJo, per: 12 + r() * 30, sper: 16 + r() * 14, lo, hi, vol: man >= 10000 ? `${(man / 10000).toFixed(2)}억 주` : `${man.toLocaleString("ko-KR")}만 주`, x };
}
export const PEERS: Record<string, number> = { NVDA: 34.2, AMD: 29.5, AVGO: 31.8 };

export const AI_TODAY = new Date(2026, 9, 1);
export const EARN_DATE: Record<string, Date> = { NKE: new Date(2026, 9, 2), JPM: new Date(2026, 9, 14), TSM: new Date(2026, 9, 16), NFLX: new Date(2026, 9, 17), TSLA: new Date(2026, 9, 22), NVDA: new Date(2026, 10, 19) };
/* 다음 실적 발표일. 정해 둔 종목이 아니면 10월 하순~11월 중순 사이 평일 하나를 종목마다 고정해서 쓴다 */
export function earnDateOf(s: string): Date {
  if (EARN_DATE[s]) return EARN_DATE[s];
  const r = rng(symSeed(s) + 5), d = new Date(2026, 9, 22 + Math.floor(r() * 22));
  while (d.getDay() % 6 === 0) d.setDate(d.getDate() + 1);
  return d;
}
export const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const mdw = (d: Date): string => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
export const md = (t: Date): string => `${t.getMonth() + 1}/${t.getDate()}`;
/* 다가올 일: 이 종목 실적과 관련 회사 일정. 시간축을 늘리지 않고 차트 오른쪽 아래 구석에만 표시한다 */
export const UPCOMING: Record<string, [Date, string][]> = { NVDA: [[new Date(2026, 9, 15), "TSMC 3분기 실적 발표"]], AMD: [[new Date(2026, 9, 15), "TSMC 3분기 실적 발표"]] };
/* 지난 일: 분기마다 있었던 실적 발표, 이 종목 뉴스 */
export function chartEventsOf(s: string): ChartEvent[] {
  const out: ChartEvent[] = [], ed = earnDateOf(s);
  for (let k = 1; k <= 16; k++) {
    const d = new Date(ed); d.setDate(d.getDate() - 91 * k); while (d.getDay() % 6 === 0) d.setDate(d.getDate() - 1);
    out.push({ t: d, k: "earn", title: "실적 발표" });
  }
  NEWS.forEach(([h, , rel, , syms], i) => { const d = syms.includes(s) && newsDay(rel); if (d) out.push({ t: d, k: "news", title: h, n: i, newsId: `n_${i}` }); });
  // 목록에 기사가 없어도 마지막 날 움직인 이유가 뉴스라면 그날에 표시
  if (WHY[s] && WHY[s][1].startsWith("뉴스") && !out.some(e => e.k === "news" && +e.t === +LAST_DAY)) out.push({ t: new Date(LAST_DAY), k: "news", title: WHY[s][0] });
  return out.sort((a, b) => +b.t - +a.t);
}
export function upcomingOf(s: string): UpcomingEvent[] {
  return [{ at: earnDateOf(s), title: "실적 발표", mine: true }, ...(UPCOMING[s] || []).map(([d, t]) => ({ at: d, title: t, mine: false }))].sort((a, b) => +a.at - +b.at);
}
export const ddayOf = (d: Date): number => Math.round((+d - +AI_TODAY) / 864e5);
