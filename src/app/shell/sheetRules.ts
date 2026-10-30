/* 주문 시트와 규칙 시트의 검증. 목업 gops.js 542~593줄의 계산을 순수 함수로 뺐다. 화면과 API 둘 다 이 값을 쓴다 */
import type { Fmt } from "../format";

export type OrderInput = { side: "buy" | "sell"; price: number; qty: number; fromChart: boolean; currentPrice: number; changePercent: number; held: number; cash: number; weightBase: number };
export type OrderCheck = { err: string; max: number; amt: number; weight: number; chaseWarn: boolean };
export function orderCheck(i: OrderInput): OrderCheck {
  const max = i.side === "buy" ? Math.floor(i.cash / i.price) : i.held;
  const err = !(i.qty > 0) ? "수량을 1주 이상 입력해 주세요." : i.qty > max ? (i.side === "buy" ? `주문 가능 금액으로는 최대 ${max}주까지 살 수 있어요.` : `보유 수량 ${i.held}주까지 팔 수 있어요.`) : "";
  const amt = i.price * (i.qty || 0), weight = i.side === "buy" ? ((i.held + i.qty) * i.currentPrice) / i.weightBase * 100 : 0;
  const chaseWarn = i.side === "buy" && !i.fromChart && i.changePercent > 2;
  return { err, max, amt, weight, chaseWarn };
}

export type RuleInput = { price: string; dir: "above" | "below"; currentPrice: number };
export function ruleCheck(i: RuleInput, fmt: Fmt): { err: string; pv: number } {
  const pv = parseFloat(i.price);
  const err = !(pv > 0) ? "기준 가격을 입력해 주세요." : (i.dir === "above" && pv <= i.currentPrice) ? `돌파 조건은 현재가(${fmt.usd(i.currentPrice)})보다 높아야 해요.` : "";
  return { err, pv };
}
/* 기준 가격 기본값: 현재가의 5% 위 */
export const defaultRulePrice = (currentPrice: number): string => (Math.round(currentPrice * 1.05 * 100) / 100).toFixed(2);
export const defaultRuleDir = (price: number, currentPrice: number): "above" | "below" => (price < currentPrice ? "below" : "above");
