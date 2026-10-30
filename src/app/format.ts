/* 숫자·금액 표기. 목업 gops.js 58~74줄. 통화(원/달러)는 주소 ?cur= 가 우선, 없으면 저장된 설정 (원이 기본) */
import { useCallback } from "react";
import { useQ } from "./query";
import { prefs } from "./store";

export const FX = 1382.5;   // D6 환율. 훅으로 받은 값이 있으면 그걸 쓴다 (useFormat(rate))

export const usdRaw = (v: number, d = 2): string => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const krw = (v: number): string => (v < 0 ? "-₩" : "₩") + Math.round(Math.abs(v)).toLocaleString("ko-KR");
export const pct = (v: number): string => (v > 0 ? "+" : "") + v.toFixed(2) + "%";
export const tone = (v: number): "up" | "down" | "muted" => v > 0 ? "up" : v < 0 ? "down" : "muted";

export type Fmt = {
  /** 원화로 보는 중인지 */
  krwMode: boolean;
  fx: number;
  /** 달러 금액을 고른 통화로 */
  usd: (v: number, d?: number) => string;
  /** 고른 통화의 반대쪽 표기 (보조 줄용). 앞의 보이지 않는 글자는 t() 가 건너뛰라는 표시 */
  alt: (v: number) => string;
  /** 큰 금액(십억 달러 단위)을 고른 통화로: 원이면 조·억 원, 달러면 억 달러 */
  bigMoney: (b: number) => string;
  /** 글 속에 박힌 "$179.80", "+$612" 같은 금액을 고른 통화로 바꿔 쓴다. 학습 문제처럼 달러 그대로여야 하는 글에는 쓰지 않는다 */
  t: (h: string) => string;
};

export function makeFmt(krwMode: boolean, fx = FX): Fmt {
  const usd = (v: number, d = 2) => krwMode ? krw(v * fx) : usdRaw(v, d);
  const alt = (v: number) => krwMode ? "⁠" + usdRaw(v) : krw(v * fx);
  const bigMoney = (b: number) => {
    if (!krwMode) return b >= 1000 ? `$${(b / 1000).toFixed(2)}T` : `${Math.round(b * 10).toLocaleString("ko-KR")}억 달러`;
    const eok = b * 10 * fx; return eok >= 10000 ? `${(eok / 10000).toLocaleString("ko-KR", { maximumFractionDigits: eok >= 100000 ? 0 : 1 })}조 원` : `${Math.round(eok).toLocaleString("ko-KR")}억 원`;
  };
  const t = (h: string) => krwMode ? String(h).replace(/(?<!⁠[+-]?)([+-]?)\$(\d[\d,]*(?:\.\d+)?)(?![\d.]*[TBK%])/g, (_m, sg: string, n: string) => (sg === "+" ? "+" : "") + usd((sg === "-" ? -1 : 1) * parseFloat(n.replace(/,/g, "")))) : h;
  return { krwMode, fx, usd, alt, bigMoney, t };
}

/* 화면에서 쓰는 통화 설정: 원이 기본, 달러는 고른 사람만 (?cur=usd, 브라우저에 기억). 예전에 저장된 "krw"도 원으로 읽는다 */
export function useCurrency(): { krwMode: boolean; setCur: (v: "" | "usd") => void } {
  const { q, setQ } = useQ();
  const krwMode = (q("cur") || prefs.cur.get() || "krw") !== "usd";
  const setCur = useCallback((v: "" | "usd") => setQ({ cur: v }), [setQ]);
  return { krwMode, setCur };
}
export function useFormat(fx = FX): Fmt {
  const { krwMode } = useCurrency();
  return makeFmt(krwMode, fx);
}
