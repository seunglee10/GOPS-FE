/* 목업 gops.js 521~534줄 renderToasts. ?toast= 로 미리 정한 토스트도 보여 준다 */
import { Link } from "react-router-dom";
import { Ic } from "../icons";
import { useFormat } from "../format";
import { useToast, type ToastItem } from "./ToastProvider";
import type { Actions } from "./actions";

export const TOAST_PRESET: Record<string, [string, Partial<ToastItem>]> = {
  order: ["매수 주문을 넣었어요. 체결을 기다리는 중이에요.", { action: "주문 내역", href: "/portfolio?tab=orders" }],
  rule: ["규칙을 만들었어요. 조건이 맞으면 알려 드릴게요.", { action: "규칙 보기", href: "/portfolio?tab=rules&new=1" }],
  ruleoff: ["NVDA $150.00 돌파 알림을 껐어요.", { action: "실행 취소" }],
  removed: ["TSLA를 관심 종목에서 뺐어요.", { action: "실행 취소" }],
  error: ["주문을 넣지 못했어요. 브로커가 10초 안에 응답하지 않았어요.", { error: true, action: "다시 시도" }],
  guard: ["가드레일을 저장했어요. 다음 주문부터 적용돼요.", {}],
};

export function Toasts({ act }: { act: Actions }) {
  const { toasts } = useToast();
  const fmt = useFormat();
  const key = act.q("toast");
  const pre: ToastItem[] = key && TOAST_PRESET[key] ? [{ id: "p", msg: TOAST_PRESET[key][0], ...TOAST_PRESET[key][1] }] : [];
  const list = toasts.length ? toasts : pre;
  return (
    <div className="toasts" id="toasts" role="status" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.error ? "error" : ""}`}>
          <span className="i"><Ic name={t.error ? "warn" : "check"} /></span><span>{fmt.t(t.msg)}</span>
          {t.action ? (t.href ? <Link className="act" to={t.href}>{t.action}</Link> : <button className="act" onClick={act.toastAct}>{t.action}</button>) : null}
          <button className="iconbtn" style={{ width: 28, height: 28 }} onClick={act.toastClose} aria-label="닫기"><Ic name="x" /></button>
        </div>
      ))}
    </div>
  );
}
