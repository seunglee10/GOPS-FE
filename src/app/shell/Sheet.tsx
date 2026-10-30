/* 주문 시트와 규칙 시트. 목업 gops.js 535~593줄. 마크업과 클래스는 그대로, 상태는 주소 쿼리(rs, side, price, qty, dir, act, from) */
import { useState } from "react";
import { Ic } from "../icons";
import { useFormat } from "../format";
import { useSymbolMap } from "./useSymbolMap";
import { useAccount } from "../../data/hooks/useAccount";
import { useOrder } from "../../data/hooks/useOrder";
import { useRules } from "../../data/hooks/useRules";
import { DebouncedInput } from "./Field";
import { orderCheck, ruleCheck, defaultRuleDir, defaultRulePrice } from "./sheetRules";
import type { Actions } from "./actions";
import { pct } from "../format";

export function Overlay({ act, dialog }: { act: Actions; dialog: React.ReactNode }) {
  const sheet = act.q("sheet"), dlg = act.q("dialog");
  if (!sheet && !dlg) return <div id="overlay" />;
  if (dlg) return <div id="overlay"><div className="dialog-wrap" onClick={e => { if (e.target === e.currentTarget) act.closeDialog(); }}><div className="dialog" role="dialog" aria-modal="true">{dialog}</div></div></div>;
  return (
    <div id="overlay">
      <div className="scrim" onClick={e => { if (e.target === e.currentTarget) act.closeSheet(); }} />
      <aside className="sheet" role="dialog" aria-label={sheet === "order" ? "주문" : "규칙"}>{sheet === "order" ? <OrderSheet act={act} /> : <RuleSheet act={act} />}</aside>
    </div>
  );
}

export function OrderSheet({ act }: { act: Actions }) {
  const { q, setQ } = act;
  const fmt = useFormat();
  const syms = useSymbolMap();
  const { summary } = useAccount();
  const { place } = useOrder();
  const [loading, setLoading] = useState(false);
  const s = (q("rs") || "NVDA").toUpperCase(), st = syms[s] || syms.NVDA;
  if (!st || !summary.data) return null;
  const side = q("side") === "sell" ? "sell" : "buy";
  const price = q("price") ? +q("price")! : st.price, fromChart = !!q("price");
  const qty = q("qty") != null ? +q("qty")! : 10;
  const held = summary.data.holdings.find(h => h.symbol === s)?.qty ?? 0;
  const { err, max, amt, weight, chaseWarn } = orderCheck({ side, price, qty, fromChart, currentPrice: st.price, changePercent: st.changePercent, held, cash: summary.data.cash, weightBase: Math.round(summary.data.totalValue) });
  const submit = async () => {
    if (act.requireLogin("submit-order") || err || loading) return;
    setLoading(true);
    try { await place.run({ symbol: s, side, type: "limit", qty, price, memo: null }); }
    catch { setLoading(false); act.toast("주문을 넣지 못했어요. 브로커가 10초 안에 응답하지 않았어요.", { error: true, action: "다시 시도" }); return; }
    setLoading(false);
    setQ({ sheet: null, rs: null, price: null, side: null, qty: null });
    act.toast("매수 주문을 넣었어요. 체결을 기다리는 중이에요.", { action: "주문 내역", href: "/portfolio?tab=orders" });
  };
  return <>
    <div className="sheet-head"><div className="grow"><h2>{st.nameKo} {side === "buy" ? "매수" : "매도"}</h2><span className="t-caption">{s}, 모의투자 계좌</span></div>
      <button className="iconbtn" onClick={act.closeSheet} aria-label="닫기"><Ic name="x18" /></button></div>
    <div className="sheet-body">
      <div className="seg block" role="group" aria-label="주문 방향"><button className="is-buy" aria-pressed={side === "buy"} onClick={() => act.set("side", "buy")}>매수</button><button className="is-sell" aria-pressed={side === "sell"} onClick={() => act.set("side", "sell")}>매도</button></div>
      <div className="field"><span className="label">주문 유형</span><div className="seg block"><button aria-pressed="true">지정가</button><button aria-pressed="false">시장가</button><button aria-pressed="false" data-tip="장 시작 전에는 조건부 주문만 가능해요">조건부</button></div></div>
      <div className="field"><label htmlFor="f-price">가격 {fromChart ? <span className="from-chart">차트 지지선에서 가져옴</span> : null}</label>
        <div className="input"><DebouncedInput id="f-price" value={price.toFixed(2)} inputMode="decimal" onCommit={v => setQ({ price: v })} /><span className="unit">USD, 현재가 {fmt.usd(st.price)}</span></div></div>
      <div className="field"><label htmlFor="f-qty">수량</label>
        <div className={`input ${err ? "invalid" : ""}`}><DebouncedInput id="f-qty" value={qty ? String(qty) : ""} inputMode="numeric" aria-invalid={!!err} aria-describedby="qty-help" onCommit={v => setQ({ qty: v })} /><span className="unit">주</span></div>
        {err ? <span className="help error" id="qty-help"><Ic name="warn" />{err}</span> : <span className="help" id="qty-help">최대 {max}주, <button className="blue" onClick={() => act.set("qty", max)}>최대로 채우기</button></span>}</div>
      <div className="sum"><div><span className="muted">주문 금액</span><span className="big">{fmt.usd(amt)}</span></div><div><span className="muted">{fmt.krwMode ? "달러" : "원화"} 환산 (1달러 1,382.50원)</span><span>{fmt.alt(amt)}</span></div><div><span className="muted">예상 수수료</span><span>$0.00</span></div></div>
      <div className="field"><span className="label">주문 전 점검</span><div className="checks">
        <div className={`chk ${err ? "fail" : ""}`}><span className="i"><Ic name={err ? "warn" : "check"} /></span><div>{err ? "주문 가능 범위를 넘었어요" : "주문 가능 금액 안이에요"}<small>{side === "buy" ? `주문 후 현금 ${fmt.usd(Math.max(summary.data.cash - amt, 0))}` : `보유 ${held}주`}</small></div></div>
        {side === "buy" ? <div className={`chk ${weight > 25 ? "warn" : ""}`}><span className="i"><Ic name={weight > 25 ? "warn" : "check"} /></span><div>{s} 비중 {weight.toFixed(0)}%{weight > 25 ? ", 한도 25%를 넘어요" : ", 한도 25% 안이에요"}<small>코치 가드레일</small></div></div> : null}
        {side === "buy" ? <div className={`chk ${chaseWarn ? "warn" : ""}`}><span className="i"><Ic name={chaseWarn ? "warn" : "check"} /></span><div>{chaseWarn ? `오늘 ${pct(st.changePercent)} 오른 종목이에요` : "추격 매수가 아니에요"}<small>{chaseWarn ? "급등일 추격 매수 경고가 켜져 있어요" : "지지선 근처 지정가 주문"}</small></div></div> : null}
      </div></div>
    </div>
    <div className="sheet-foot">
      <button className={`btn lg block ${side} ${loading ? "is-loading" : ""}`} onClick={submit} aria-disabled={err ? "true" : undefined} data-tip={err || undefined}>{side === "buy" ? "매수" : "매도"} 주문 넣기</button>
      <span className="t-caption" style={{ textAlign: "center" }}>주문은 이 버튼을 눌러야만 들어가요. 에이전트는 주문을 넣지 않아요.</span>
    </div>
  </>;
}

export function RuleSheet({ act }: { act: Actions }) {
  const { q, setQ } = act;
  const fmt = useFormat();
  const syms = useSymbolMap();
  const { create } = useRules();
  const [loading, setLoading] = useState(false);
  const s = (q("rs") || "NVDA").toUpperCase(), st = syms[s] || syms.NVDA;
  if (!st) return null;
  const price = q("price") != null ? q("price")! : defaultRulePrice(st.price);
  const dir = (q("dir") as "above" | "below" | null) || defaultRuleDir(+price, st.price), action = q("act") || "notify";
  const { err, pv } = ruleCheck({ price, dir, currentPrice: st.price }, fmt);
  const submit = async () => {
    if (act.requireLogin("submit-rule") || err || loading) return;
    const fromAgent = q("from") === "agent";
    setLoading(true);
    try { await create.run({ symbol: s, cond: "price", dir, price: pv, action: action === "order" ? "order" : "notify", repeat: 1, source: fromAgent ? "agent" : "user" }); }
    catch { setLoading(false); act.toast("규칙을 만들지 못했어요.", { error: true, action: "다시 시도" }); return; }
    setLoading(false);
    setQ({ sheet: null, rs: null, price: null, dir: null, from: null, act: null, done: fromAgent ? "rule" : null });
    act.toast("규칙을 만들었어요. 조건이 맞으면 알려 드릴게요.", { action: "규칙 보기", href: "/portfolio?tab=rules&new=1" });
  };
  return <>
    <div className="sheet-head"><div className="grow"><h2>새 규칙</h2><span className="t-caption">{st.nameKo}, {s}</span></div><button className="iconbtn" onClick={act.closeSheet} aria-label="닫기"><Ic name="x18" /></button></div>
    <div className="sheet-body">
      {q("from") === "agent" ? <div className="banner"><span className="caution"><Ic name="spark" /></span><span className="grow">에이전트가 제안한 규칙이에요. 내용을 확인한 뒤 만들어 주세요.</span></div> : null}
      <div className="field"><span className="label">조건</span><div className="seg block"><button aria-pressed="true">가격</button><button aria-pressed="false">등락률</button><button aria-pressed="false">거래량</button><button aria-pressed="false">RSI</button></div></div>
      <div className="field"><span className="label">가격이</span><div className="seg block"><button aria-pressed={dir === "above"} onClick={() => act.set("dir", "above")}>위로 돌파</button><button aria-pressed={dir === "below"} onClick={() => act.set("dir", "below")}>아래로 하락</button></div></div>
      <div className="field"><label htmlFor="f-rp">기준 가격</label><div className={`input ${err ? "invalid" : ""}`}><DebouncedInput id="f-rp" value={price} inputMode="decimal" aria-invalid={!!err} onCommit={v => setQ({ price: v })} /><span className="unit">USD</span></div>
        {err ? <span className="help error"><Ic name="warn" />{err}</span> : <span className="help">현재가 대비 {pct((pv / st.price - 1) * 100)}</span>}</div>
      <div className="field"><span className="label">조건이 맞으면</span><div className="choice" role="radiogroup">
        <button role="radio" aria-checked={action === "notify"} onClick={() => act.set("act", "notify")}><span className="o"></span><span><b>알림만 보내기</b><small>앱 알림과 알림함으로 알려 드려요.</small></span></button>
        <button role="radio" aria-checked={action === "order"} onClick={() => act.set("act", "order")}><span className="o"></span><span><b>알림 보내고 주문 넣기</b><small>10주 지정가 {fmt.usd(pv || 0)} 매수. 발동 전까지 언제든 끌 수 있어요.</small></span></button>
      </div></div>
      <div className="field"><span className="label">반복</span><div className="seg block"><button aria-pressed="true">1회</button><button aria-pressed="false">3회</button><button aria-pressed="false">계속</button></div><span className="help">30일 뒤 자동으로 꺼져요.</span></div>
    </div>
    <div className="sheet-foot"><button className={`btn lg block primary ${loading ? "is-loading" : ""}`} onClick={submit} aria-disabled={err ? "true" : undefined} data-tip={err || undefined}>규칙 만들기</button></div>
  </>;
}
