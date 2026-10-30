/* 종목 화면 보조 목 데이터: 기관·내부자·공매도 (목업 gops.js 1911~1923), 분기 매출·수익성 (2042~2053), 비교 표 (2058~2060).
   값은 전부 가짜다. 목업은 패널을 그릴 때마다 같은 시드로 다시 뽑았는데, 여기서는 한 번 뽑아 머리말과 패널이 같은 값을 쓴다 */
import type { ComparePayload, FundamentalsPayload, InvestorFlows } from "../../api/types";
import { S } from "./symbols";
import { rng, symSeed, volX } from "./candles";
import { factsOf } from "./facts";

export function investorFlowsOf(s: string): InvestorFlows {
  let r = rng(symSeed(s) + 11);
  const institutionalPercent = +(56 + r() * 24).toFixed(1), institutionalChangePp = +((r() - 0.4) * 2).toFixed(1), institutionCount = 1800 + Math.floor(r() * 2400);
  r = rng(symSeed(s) + 11);
  const sp = 0.8 + r() * 3, shortHistory = Array.from({ length: 6 }, () => sp * (0.8 + r() * 0.4));
  return {
    symbol: s, institutionalPercent, institutionalChangePp, institutionCount,
    insiderTrades: [["9/24", "이사", "sell", 12000], ["9/12", "CFO", "sell", 8500], ["8/30", "이사", "buy", 2000], ["8/15", "CEO", "sell", 40000], ["7/29", "이사", "buy", 1500]]
      .map(([date, role, side, shares]) => ({ date: date as string, role: role as string, side: side as "buy" | "sell", shares: shares as number })),
    shortPercent: sp, shortHistory, daysToCover: 0.6 + r() * 2, borrowFeePercent: 0.25 + r() * 0.5,
  };
}

/* 목업은 어느 종목이든 같은 분기 매출(엔비디아 값)을 보여 준다 */
const REV: [period: string, revenueB: number, estimate?: boolean][] = [["2025Q3", 18.1], ["2025Q4", 22.1], ["2026Q1", 26.0], ["2026Q2", 30.0], ["2026Q3", 33.5, true]];
const PROFIT: [string, number, number][] = [["매출총이익률", 75.1, 58.2], ["영업이익률", 62.4, 24.9], ["ROE", 91.8, 21.3], ["부채비율", 17.2, 44.0]];
export function fundamentalsOf(s: string, period: "quarterly" | "annual"): FundamentalsPayload {
  return { symbol: s, period, items: REV.map(([p, v, est]) => ({ period: p, revenue: v * 1e9, operatingIncome: null, netIncome: null, operatingMargin: null, eps: null, ...(est ? { estimate: true } : {}) })),
    profitability: PROFIT.map(([labelKo, value, sectorMedian]) => ({ labelKo, value, sectorMedian })) };
}

const COMPARE: Record<string, [d: number, m3: number, per: number, opm: number, vx: number]> = { NVDA: [2.12, 27.4, 34.2, 62.4, 2.1], AMD: [3.05, 18.9, 29.5, 22.1, 1.6], AVGO: [1.34, 12.3, 31.8, 45.0, 1.2] };
export function compareOf(symbols: string[]): ComparePayload {
  return { items: symbols.filter(k => S[k]).map(k => {
    const c = COMPARE[k];
    return c ? { symbol: k, nameKo: S[k].ko, changePercent: c[0], return3mPercent: c[1], per: c[2], operatingMarginPercent: c[3], volumeRatio20d: c[4] }
      : { symbol: k, nameKo: S[k].ko, changePercent: S[k].d, return3mPercent: null, per: +factsOf(k).per.toFixed(1), operatingMarginPercent: null, volumeRatio20d: +volX(k).toFixed(1) };
  }) };
}

/* 목업 factsOf 의 거래량 글("4.12억 주", "1,234만 주")을 주 수로 */
export function volumeSharesOf(s: string): number {
  const v = factsOf(s).vol, m = /([\d.,]+)(억|만)/.exec(v);
  return m ? parseFloat(m[1].replace(/,/g, "")) * (m[2] === "억" ? 1e8 : 1e4) : 0;
}
