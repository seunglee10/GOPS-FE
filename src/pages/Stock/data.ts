/* 종목 화면이 같이 쓰는 데이터와 상태. 목업 gops.js 의 LIVE(1803), factsOf(969), CHS.refs(2263), OI(1883) 를 한곳에 모은다.
   데이터는 전부 훅으로만 읽는다 */
import { createContext, useContext, useMemo } from "react";
import type { Candle, Holding, InvestorFlows, Levels, LiveQuote, StockSummary } from "../../api/types";
import { useAccount, useCandles, useChartEvents, useFx, useHeatmap, useInvestorFlows, useLevels, useLive, useMovers, useStockSummary } from "../../data/hooks";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { useSession } from "../../app/session";

export type Facts = { per: number; sper: number; lo: number; hi: number; x: number; volShares: number; capB: number };

export type StockData = {
  s: string;
  nameKo: string;
  color: string | null;
  summary: StockSummary | null;
  /** 2016년부터 일봉 (차트 모듈 입력) */
  daily: Candle[];
  /** 최근 84거래일. 목업 candlesOf 와 같은 범위 (지표·용어 카드 계산용) */
  C: Candle[];
  live: LiveQuote | null;
  /** 지금 가격(실시간이 있으면 그 값) */
  p: number;
  /** 어제 종가 */
  pc: number;
  /** 오늘 등락률 (목업 st.d) */
  d: number;
  F: Facts | null;
  levels: Levels | null;
  flows: InvestorFlows | null;
  flowsLoading: boolean;
  holding: Holding | null;
  cash: number | null;
  /** 같은 섹터의 단순 평균 등락 (목업 secAvg) */
  secName: string;
  secAvg: number;
  /** 오늘 움직인 이유 (목업 WHY) */
  why: string | null;
  asOf: Date;
  nextEarn: Date | null;
  fx: number;
  /** 종목 요약을 못 읽었을 때 */
  error: Error | null;
};

export function useStockData(s: string): StockData {
  const syms = useSymbolMap();
  const { guest } = useSession();
  const summary = useStockSummary(s), daily = useCandles(s, "D"), live = useLive(s), levels = useLevels(s), events = useChartEvents(s);
  const heat = useHeatmap(), flows = useInvestorFlows(s), fx = useFx(), movers = useMovers("trade", "us");
  const { summary: acct } = useAccount();
  const st = syms[s], sm = summary.data;
  const D = daily.data ?? [];
  const C = useMemo(() => D.slice(-84), [D]);
  const p = live?.price ?? sm?.price ?? st?.price ?? 0;
  const pc = live?.prevClose ?? (sm ? sm.price - sm.change : st ? st.price / (1 + st.changePercent / 100) : p);
  const sec = useMemo(() => {
    const items = heat.data?.items ?? [], me = items.find(i => i.symbol === s), name = sm?.sectorLabelKo ?? me?.sectorLabelKo ?? null;
    const list = name ? items.filter(i => i.sectorLabelKo === name) : [];
    return { name: name ?? "시장", avg: list.length ? list.reduce((a, t) => a + t.changePercent, 0) / list.length : 0 };
  }, [heat.data, sm, s]);
  const F: Facts | null = sm && sm.per != null && sm.sectorPer != null && sm.low52 != null && sm.high52 != null
    ? { per: sm.per, sper: sm.sectorPer, lo: sm.low52, hi: sm.high52, x: sm.volumeRatio20d ?? 1, volShares: sm.volume ?? 0, capB: (sm.marketCap ?? 0) / 1e9 } : null;
  const holding = !guest ? acct.data?.holdings.find(h => h.symbol === s) ?? null : null;
  return {
    s, nameKo: sm?.nameKo ?? st?.nameKo ?? s, color: st?.color ?? null, summary: sm, daily: D, C, live, p, pc,
    d: sm?.changePercent ?? st?.changePercent ?? 0, F, levels: levels.data ? { sup: levels.data.sup, res: levels.data.res } : null,
    flows: flows.data ?? null, flowsLoading: flows.loading, holding, cash: acct.data?.cash ?? null,
    secName: sec.name, secAvg: sec.avg, why: movers.data?.items.find(i => i.symbol === s)?.issue ?? null,
    asOf: events.data?.asOf ?? new Date(), nextEarn: events.data?.upcoming.find(u => u.mine)?.at ?? events.data?.nextEarningsAt ?? null,
    fx: fx.data?.rate || 1382.5,
    error: summary.error,
  };
}

export const ddayOf = (d: Date, asOf: Date) => Math.round((+d - +asOf) / 864e5);
export const md = (t: Date) => `${t.getMonth() + 1}/${t.getDate()}`;
const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const mdw = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const tickStep = (p: number) => p >= 500 ? 0.05 : 0.01;

/* 지난 4달을 한 달(21거래일) 단위로 끊어 본 변동 폭 (목업 swingOf 1054) */
export function swingOf(C: Candle[]) {
  const rets: number[] = [];
  for (let i = 21; i < C.length; i++) rets.push((C[i].c / C[i - 21].c - 1) * 100);
  const abs = rets.map(Math.abs).sort((a, b) => a - b);
  return { typical: abs[Math.floor(abs.length / 2)] ?? 0, worst: rets.length ? Math.min(...rets) : 0, best: rets.length ? Math.max(...rets) : 0, month: rets[rets.length - 1] ?? 0, monthAgo: C[C.length - 22]?.c ?? 0 };
}

/* ---------- 화면 상태: 사이드바에서 켜는 기준선, 인라인 주문 ---------- */
export type RefKey = "hi52" | "lo52" | "avg" | "sup" | "res";
export type Refs = Record<RefKey, boolean>;
export const REFS_DEFAULT: Refs = { hi52: false, lo52: false, avg: true, sup: true, res: true };
export type OI = { side: "buy" | "sell"; type: "limit" | "market"; price: string | null; qty: string };
export const OI_DEFAULT: OI = { side: "buy", type: "limit", price: null, qty: "" };

export type StockUi = {
  refs: Refs;
  setRefs: (r: Refs) => void;
  oi: OI;
  setOi: (patch: Partial<OI>) => void;
  /** 주문 패널 가격 칸을 반짝이고 수량 칸으로 옮길 때 올리는 번호 */
  flash: number;
  bumpFlash: () => void;
};
export const StockUiContext = createContext<StockUi | null>(null);
export function useStockUi(): StockUi {
  const v = useContext(StockUiContext); if (!v) throw new Error("useStockUi outside StockPage"); return v;
}
