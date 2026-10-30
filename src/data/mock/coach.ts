/* 투자 복기 목 데이터. 목업 gops.js 2956~3090줄. 9월 주문 14건, 8월 비교 지표, 가드레일 */
import type { Guardrails, Habit, ReviewTrade } from "../../api/types";
import { S } from "./symbols";

/* [날짜, 종목, 구분, 수량, 가격, (매도면) 평단, 습관, 메모]. 판 주문은 판 가격 기준 확정 손익, 산 주문은 오늘 가격 기준 손익 */
type TradeRow = [d: string, k: string, side: "매수" | "매도", qty: number, px: number, avg: number, h: Habit, memo: string];
const T_ROWS: TradeRow[] = [
  ["9/02", "NVDA", "매수", 8, 108.00, 0, "plan", "20일 평균선 지지 확인, 손절가 $99"],
  ["9/03", "AVGO", "매수", 5, 191.00, 0, "chase", "+4.8% 오른 날 따라 삼"],
  ["9/05", "MSFT", "매도", 3, 405.00, 402.10, "rush", "하루 -2% 보고 바로 팖"],
  ["9/08", "TSLA", "매수", 5, 272.30, 0, "avg", "물타기, 손절가 없음"],
  ["9/11", "MSFT", "매수", 2, 423.80, 0, "news", "뉴스 보고 바로 삼"],
  ["9/15", "TSLA", "매수", 5, 277.00, 0, "avg", "물타기, 손절가 없음"],
  ["9/18", "MSFT", "매수", 2, 447.60, 0, "chase", "급등한 날 따라 삼"],
  ["9/19", "NVDA", "매도", 6, 131.00, 118.40, "exit", "목표가 $130 도달, 절반 익절"],
  ["9/22", "NVDA", "매수", 12, 116.20, 0, "plan", "지지선 매수 예약 체결"],
  ["9/24", "COST", "매수", 5, 874.00, 0, "plan", "실적 안정, 비중 10% 안"],
  ["9/25", "MSFT", "매수", 1, 430.00, 0, "news", "배당 기사 보고 바로 삼"],
  ["9/26", "TSLA", "매도", 5, 262.10, 271.50, "exit", "규칙 발동 보고 손절"],
  ["9/29", "JPM", "매도", 4, 219.40, 212.30, "exit", "목표가 도달, 일부 익절"],
  ["9/30", "AVGO", "매수", 10, 179.80, 0, "plan", "20일 평균선 돌파, 손절가 $170"],
];
export const T: ReviewTrade[] = T_ROWS.map(([d, k, side, qty, px, avg, h, memo], i) => {
  const now = (S[k] || {}).p || px, buy = side === "매수";
  const pnl = buy ? (now - px) * qty : (px - avg) * qty;
  const ret = buy ? (now / px - 1) * 100 : (px / avg - 1) * 100;
  return { orderId: `o_sep_${i + 1}`, at: d, symbol: k, side: buy ? "buy" : "sell", qty, price: px, avgPriceAtSell: buy ? null : avg, now, pnl, returnPercent: ret, missedProfit: buy ? 0 : (now - px) * qty, habit: h, memo };
});
/* 8월 같은 지표 (비교용) */
export const AUG = { pnl: 412.30, win: 50, ratio: 1.21, mistake: -310.40, gap: 0.60 };
/* 9월 한 달 계좌 전체 수익률과 S&P 500 수익률 */
export const MONTH = { acct: 3.42, spx: 2.02 };
/* 습관별 손익: 9월 손익이 어디서 났는지 */
export const HABIT_NAME: [Habit, string][] = [
  ["plan", "근거 있는 매수"], ["exit", "계획대로 판 주문"], ["news", "뉴스 보고 바로 산 주문"],
  ["rush", "하락에 놀라 판 주문"], ["chase", "급등일 추격 매수"], ["avg", "손절가 없는 물타기"],
];
const sum = (a: ReviewTrade[]) => a.reduce((t, x) => t + x.pnl, 0);
export const H = HABIT_NAME.map(([key, name]) => { const g = T.filter(t => t.habit === key); return { key, name, n: g.length, w: g.filter(t => t.pnl > 0).length, pnl: sum(g), missed: g.reduce((a, t) => a + t.missedProfit, 0) }; });

/* 가드레일 기본값. g1 급등일 추격 매수 경고(켜짐), g3 손절가 없는 물타기 막기(꺼짐), g4 하루 하락 매도 전 확인(꺼짐), 비중 25% */
export const GUARDRAILS: Guardrails = { chaseBuyWarnPercent: 3.0, blockAverageDownWithoutStop: false, confirmSellOnDropPercent: null, maxPositionWeightPercent: 25 };

/* 복기 KPI (목업 pageCoach 가 T 에서 계산하던 값) */
export function reviewKpi() {
  const wins = T.filter(t => t.pnl > 0), losses = T.filter(t => t.pnl < 0);
  const total = sum(T), winRate = wins.length / T.length * 100;
  const avgWin = sum(wins) / wins.length, avgLoss = -sum(losses) / losses.length, ratio = avgWin / avgLoss;
  const mistakes = T.filter(t => t.habit === "chase" || t.habit === "avg"), gap = MONTH.acct - MONTH.spx;
  return { total, winRate, ratio, mistakePnl: sum(mistakes), gap, missed: T.reduce((a, t) => a + t.missedProfit, 0) };
}
