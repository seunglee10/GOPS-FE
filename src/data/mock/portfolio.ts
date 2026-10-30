/* 모의투자 계좌 목 데이터. 목업 gops.js 41~56, 401, 2901~2951줄 */
import type { ActivityItem, Rule } from "../../api/types";
import { S, CASH } from "./symbols";
import { rng } from "./candles";

/* [티커, 수량, 평단] */
export type Holding3 = [symbol: string, qty: number, avgPrice: number];
export const HOLD: Holding3[] = [["NVDA", 42, 118.40], ["MSFT", 12, 402.10], ["AVGO", 30, 186.20], ["COST", 5, 874.00], ["TSLA", 15, 271.50], ["LLY", 8, 868.40], ["JPM", 22, 212.30]];
export const heldQty = (s: string): number => (HOLD.find(h => h[0] === s) || [s, 0, 0])[1];

export const RULES: Rule[] = [
  { id: "r1", symbol: "NVDA", condKo: "가격이 $150.00 위로 돌파", actKo: "알림", source: "agent", sourceKo: "에이전트 제안", enabled: true, statusKo: "대기 중" },
  { id: "r2", symbol: "NVDA", condKo: "가격이 $137.70 아래로 하락", actKo: "알림, 10주 매수 예약", source: "chart", sourceKo: "차트", enabled: true, statusKo: "대기 중" },
  { id: "r3", symbol: "TSLA", condKo: "하루 등락률 -5% 이하", actKo: "알림", source: "user", sourceKo: "직접 만듦", enabled: true, statusKo: "9/24 발동" },
  { id: "r4", symbol: "AVGO", condKo: "RSI(14) 30 이하", actKo: "알림", source: "user", sourceKo: "직접 만듦", enabled: false, statusKo: "꺼짐" },
  { id: "r5", symbol: "시장", condKo: "장 시작 10분 전", actKo: "알림", source: "default", sourceKo: "기본 설정", enabled: true, statusKo: "매일" },
];

/* [시간, 종목, 구분, 유형, 수량, 가격, 상태] */
export type Order7 = [at: string, symbol: string, side: "매수" | "매도", type: "지정가" | "시장가", qty: number, price: number, status: "대기" | "체결" | "취소"];
export const ORDERS: Order7[] = [
  ["오늘 09:41", "NVDA", "매수", "지정가", 10, 137.70, "대기"],
  ["9/29 22:31", "AVGO", "매수", "지정가", 10, 179.80, "체결"],
  ["9/26 23:05", "TSLA", "매도", "시장가", 5, 262.10, "체결"],
  ["9/25 22:40", "MSFT", "매수", "지정가", 4, 410.00, "취소"],
  ["9/24 23:12", "COST", "매수", "지정가", 5, 874.00, "체결"],
  ["9/22 22:35", "NVDA", "매수", "지정가", 12, 116.20, "체결"],
];

/* 계좌 요약 숫자 (드로어 '내 투자'와 내 계좌 KPI 가 같은 값을 쓴다) */
export const ACCOUNT = {
  totalValue: 48210.4,
  cash: CASH,
  todayPnl: 612.35,
  todayReturnPercent: 1.29,
  cumulativeReturnPercent: 14.82,
  openedAt: "2026-07-01",
  benchmarkReturnPercent: 6.1,   // 같은 기간 S&P 500
};
/* 비중 계산에 쓰는 총 평가 금액(목업은 48210 으로 반올림한 값을 썼다) */
export const WEIGHT_BASE = 48210;

/* 보유 종목 섹터 (자산 구성) */
export const HOLD_SECTOR: Record<string, string> = { NVDA: "정보기술", MSFT: "정보기술", AVGO: "정보기술", COST: "필수소비재", TSLA: "임의소비재", LLY: "헬스케어", JPM: "금융" };

/* 계좌 가치 변화: 7/1 $42,000 → 9/30 $48,210 (+14.8%), 같은 기간 S&P 500 +6.1%. 목업 accountExtras 의 선 두 개 */
export function performanceSeries(): { account: number[]; benchmark: number[]; labels: [label: string, index: number][] } {
  const r = rng(21), n = 64; let a = 0, b = 0; const A: number[] = [], B: number[] = [];
  for (let i = 0; i < n; i++) { a += 0.22 + (r() - 0.5) * 1.6; b += 0.095 + (r() - 0.5) * 0.7; A.push(a); B.push(b); }
  const fa = 14.82 / A[n - 1], fb = 6.1 / B[n - 1]; for (let i = 0; i < n; i++) { A[i] *= fa; B[i] *= fb; }
  return { account: A, benchmark: B, labels: [["7/1", 0], ["8/1", 22], ["9/1", 43], ["9/30", n - 1]] };
}

export const ACTIVITY: ActivityItem[] = [
  { at: "9/30", kind: "fill", symbol: "AVGO", nameKo: S.AVGO.ko, text: "브로드컴 10주 매수 체결", sub: "$179.80, 종목 화면에서 주문", ref: null },
  { at: "9/29", kind: "rule", symbol: "TSLA", nameKo: S.TSLA.ko, text: "규칙 발동: 테슬라 하루 -5%", sub: "알림만 보냄", ref: { ruleId: "r3" } },
  { at: "9/26", kind: "fill", symbol: "TSLA", nameKo: S.TSLA.ko, text: "테슬라 5주 매도 체결", sub: "$262.10, 손실 -$47.00", ref: null },
  { at: "9/25", kind: "dividend", symbol: "MSFT", nameKo: S.MSFT.ko, text: "마이크로소프트 배당금 입금", sub: "+$9.96", ref: null },
  { at: "9/24", kind: "fill", symbol: "COST", nameKo: S.COST.ko, text: "코스트코 5주 매수 체결", sub: "$874.00, 지정가", ref: null },
  { at: "9/22", kind: "fill", symbol: "NVDA", nameKo: S.NVDA.ko, text: "엔비디아 12주 매수 체결", sub: "$116.20, 지지선 매수 예약", ref: null },
];

/* 내 계좌 탭 */
export const PORTFOLIO_TABS: [key: string, label: string][] = [["holdings", "보유 종목"], ["orders", "주문 내역"], ["rules", "규칙"], ["watch", "관심 종목"]];
