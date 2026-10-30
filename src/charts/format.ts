/* 숫자·날짜 표기. 목업 gops.js의 usd/krw/pct/tone/md/mdw/cxShares 등을 매개변수(환율·통화)를 받는 꼴로 옮겼다 */
import type { Currency } from "./types";

export const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const p2 = (v: number) => String(v).padStart(2, "0");
export const md = (t: Date) => `${t.getMonth() + 1}/${t.getDate()}`;
export const mdw = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
export const pct = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";
export const tone = (v: number) => (v > 0 ? "up" : v < 0 ? "down" : "muted");
export const esc = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const fx1 = (v: number) => v.toFixed(1);

export const usdRaw = (v: number, d = 2) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const krw = (v: number) => (v < 0 ? "-₩" : "₩") + Math.round(Math.abs(v)).toLocaleString("ko-KR");

/** 고른 통화로 금액 표기. 목업의 usd(): 원이면 환율을 곱해 원화로 */
export const money = (v: number, cur: Currency, fx: number, d = 2) => (cur === "krw" ? krw(v * fx) : usdRaw(v, d));

/** 큰 금액(십억 달러 단위)을 고른 통화로: 원이면 조·억 원, 달러면 억 달러 */
export function bigMoney(b: number, cur: Currency, fx: number) {
  if (cur !== "krw") return b >= 1000 ? `$${(b / 1000).toFixed(2)}T` : `${Math.round(b * 10).toLocaleString("ko-KR")}억 달러`;
  const eok = b * 10 * fx;
  return eok >= 10000 ? `${(eok / 10000).toLocaleString("ko-KR", { maximumFractionDigits: eok >= 100000 ? 0 : 1 })}조 원` : `${Math.round(eok).toLocaleString("ko-KR")}억 원`;
}

/** 주 수: 억·만 단위 */
export const shares = (v: number) => { const a = Math.abs(v), sg = v < 0 ? "-" : ""; return a >= 1e8 ? `${sg}${(a / 1e8).toFixed(2)}억` : a >= 1e4 ? `${sg}${Math.round(a / 1e4).toLocaleString("ko-KR")}만` : `${sg}${Math.round(a)}`; };
/** 눈금 간격을 1·2·2.5·5 단위로 */
export const niceStep = (raw: number) => { const m = 10 ** Math.floor(Math.log10(raw)), f = raw / m; return (f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.75 ? 2.5 : f < 7.5 ? 5 : 10) * m; };
export const fixOf = (step: number) => { const t = String(+step.toPrecision(3)); return t.includes(".") ? t.split(".")[1].length : 0; };

/** 목업 rng(): 같은 씨앗이면 늘 같은 수열 */
export function rng(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
