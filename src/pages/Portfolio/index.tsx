/* 내 계좌. 목업 gops.js pagePortfolio(2862)·accountExtras(2912). 탭은 ?tab=holdings|orders|rules|watch, 관심 종목이 빈 상태는 ?state=empty */
import { Link, useNavigate } from "react-router-dom";
import type { Holding, Order, OrderStatus } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions, type Actions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { LetterMark, Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { pct, tone, useFormat, type Fmt } from "../../app/format";
import { useAccount, useOrders, useRules } from "../../data/hooks";
import { GuestPage } from "../_shared";
import { AccountExtras } from "./AccountExtras";

type Tab = "holdings" | "orders" | "rules" | "watch";
const TABS: [Tab, string][] = [["holdings", "보유 종목"], ["orders", "주문 내역"], ["rules", "규칙"], ["watch", "관심 종목"]];
const ORDER_SEG: [OrderStatus | "", string][] = [["", "전체"], ["pending", "대기"], ["filled", "체결"], ["cancelled", "취소"]];
const PAGE_SIZE = 6;

export default function PortfolioPage() {
  usePage("portfolio");
  const act = useActions("portfolio");
  if (act.guest) return <GuestPage />;
  return <Portfolio act={act} />;
}

/* 'M월 D일' */
const mdKo = (iso: string) => { const [, m, d] = iso.split("-"); return `${+m}월 ${+d}일`; };

function Portfolio({ act }: { act: Actions }) {
  const fmt = useFormat();
  const { summary } = useAccount();
  const rules = useRules();
  const t = act.q("tab"), tab: Tab = TABS.some(([k]) => k === t) ? (t as Tab) : "holdings", st = act.q("state");
  const a = summary.data;
  const watchList = st === "empty" ? [] : [...act.starSet()];
  const count: Record<Tab, number | null> = { holdings: a?.holdings.length ?? null, orders: null, rules: rules.data?.items.length ?? null, watch: watchList.length };
  return <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", minHeight: "100%" }}>
    {a ? <div className="kpis">
      <div className="kpi"><small>총 평가 금액</small><b>{fmt.usd(a.totalValue)}</b><span>{fmt.alt(a.totalValue)}</span></div>
      <div className="kpi"><small>오늘 손익</small><b className={tone(a.todayPnl)}>{a.todayPnl >= 0 ? "+" : "-"}{fmt.usd(Math.abs(a.todayPnl))}</b><span className={tone(a.todayReturnPercent)}>{pct(a.todayReturnPercent)}</span></div>
      <div className="kpi"><small>누적 수익률</small><b className={tone(a.cumulativeReturnPercent)}>{pct(a.cumulativeReturnPercent)}</b><span>{mdKo(a.openedAt)} 계좌 개설 이후</span></div>
      <div className="kpi"><small>주문 가능 현금</small><b>{fmt.usd(a.cash)}</b><span>{fmt.alt(a.cash)}</span></div>
    </div> : <div className="kpis" />}
    <nav className="tabs" role="tablist">{TABS.map(([k, label]) => <Link key={k} role="tab" to={`/portfolio?tab=${k}`} aria-selected={tab === k}>{label}{count[k] != null ? <span className="n">{count[k]}</span> : null}</Link>)}</nav>
    <section className="panel">
      {tab === "rules" ? <RulesTab act={act} /> : tab === "orders" ? <OrdersTab act={act} fmt={fmt} /> : tab === "watch" ? <WatchTab act={act} fmt={fmt} list={watchList} empty={st === "empty"} /> : <HoldingsTab act={act} fmt={fmt} holdings={a?.holdings ?? []} total={a?.totalValue ?? 0} />}
    </section>
    {tab === "holdings" ? <AccountExtras /> : null}
  </div>;
}

function RulesTab({ act }: { act: Actions }) {
  const fmt = useFormat();
  const syms = useSymbolMap();
  const { data } = useRules();
  const off = (act.q("off") || "").split(",");
  const items = data?.items ?? [], newest = items[0]?.id;
  return <>
    <div className="panel-head"><span className="t-label">규칙</span><span className="t-caption">조건이 맞으면 알림을 보내거나 예약한 주문을 넣어요</span><span className="spacer"></span><button className="btn sm primary" onClick={() => act.rule({ s: "NVDA" })}><Ic name="plus" />새 규칙</button></div>
    <div className="panel-body fill table-wrap"><table className="table"><thead><tr><th>종목</th><th>조건</th><th>할 일</th><th>만든 곳</th><th>상태</th><th className="r">켜기</th><th></th></tr></thead><tbody>
      {items.map(r => {
        const on = r.enabled && !off.includes(r.id), isNew = act.q("new") === "1" && r.id === newest;
        return <tr key={r.id} style={isNew ? { boxShadow: "inset 3px 0 0 var(--brand)" } : undefined}>
          <td><div className="sym">{r.symbol === "시장" ? <LetterMark letter="M" color="#444" /> : <Mark symbol={r.symbol} color={syms[r.symbol]?.color} />}<b>{r.symbol}</b></div></td>
          <td>{fmt.t(r.condKo)}<div className="t-caption">1회, 30일 뒤 만료</div></td><td>{r.actKo}</td><td className={r.source === "agent" ? "caution" : "muted"}>{r.sourceKo}</td>
          <td>{isNew ? <span className="tag blue">방금 만듦</span> : <span className={`tag ${r.statusKo.includes("발동") ? "caution" : ""}`}>{on ? r.statusKo : "꺼짐"}</span>}</td>
          <td className="r"><button className="switch" role="switch" aria-checked={on} onClick={() => act.toggleRule(r.id, r)} aria-label={`${fmt.t(r.condKo)} 켜기`}></button></td>
          <td className="r rowmenu"><button className="iconbtn" onClick={() => act.menu(r.id)} aria-label="더 보기"><Ic name="more" /></button>
            {act.q("menu") === r.id ? <div className="menu" style={{ right: 0, top: 36 }}><button><Ic name="bell" />편집</button><button><Ic name="list" />발동 기록</button><hr /><button className="danger" onClick={() => act.set("dialog", "delete-rule", { id: r.id })}>삭제</button></div> : null}</td></tr>;
      })}
    </tbody></table></div></>;
}

const SIDE_KO = { buy: "매수", sell: "매도" } as const;
const TYPE_KO = { limit: "지정가", market: "시장가", conditional: "조건부" } as const;
const STATUS: Record<OrderStatus, [string, string]> = { pending: ["blue", "체결 대기"], filled: ["ok", "체결"], cancelled: ["", "취소"] };

function OrdersTab({ act, fmt }: { act: Actions; fmt: Fmt }) {
  const syms = useSymbolMap();
  const os = act.q("os"), status = ORDER_SEG.some(([k]) => k && k === os) ? (os as OrderStatus) : "";
  const page = Math.max(1, +(act.q("op") || 1) || 1);
  const { data } = useOrders({ status: status || "all", page, size: PAGE_SIZE });
  const items: Order[] = data?.items ?? [], total = data?.total ?? 0, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0, to = (page - 1) * PAGE_SIZE + items.length;
  /* 쪽 번호: 1~3, 마지막 (목업처럼 사이를 … 로 줄인다) */
  const nums = pages <= 4 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, 2, 3, 0, pages];
  return <>
    <div className="panel-head"><span className="t-label">주문 내역</span><span className="spacer"></span><div className="seg">{ORDER_SEG.map(([k, t]) => <button key={t} aria-pressed={status === k} onClick={() => act.set("os", k, { op: null })}>{t}</button>)}</div></div>
    <div className="panel-body fill table-wrap"><table className="table"><thead><tr><th aria-sort="descending"><button>시간 <Ic name="sort" /></button></th><th>종목</th><th>구분</th><th>유형</th><th className="r">수량</th><th className="r">가격</th><th>상태</th><th></th></tr></thead><tbody>
      {items.map(o => <tr key={o.orderId}><td className="muted">{o.at}</td><td><div className="sym"><Mark symbol={o.symbol} color={syms[o.symbol]?.color} /><b>{o.symbol}</b></div></td><td className={o.side === "buy" ? "up" : "down"} style={{ fontWeight: 600 }}>{SIDE_KO[o.side]}</td><td>{TYPE_KO[o.type]}</td><td className="r">{o.qty}주</td><td className="r">{fmt.usd(o.price)}</td>
        <td><span className={`tag ${STATUS[o.status][0]}`}>{STATUS[o.status][1]}</span></td><td className="r">{o.status === "pending" ? <button className="btn sm danger">주문 취소</button> : null}</td></tr>)}
    </tbody></table>
      <div className="pager"><span>전체 {total}건 중 {from}~{to}</span><div className="pages">{nums.map((p, i) => p ? <button key={i} aria-current={p === page ? "page" : undefined} onClick={() => act.set("op", p === 1 ? null : p)}>{p}</button> : <span key={i} className="soft" style={{ alignSelf: "center" }}>…</span>)}</div></div></div></>;
}

function WatchTab({ act, fmt, list, empty }: { act: Actions; fmt: Fmt; list: string[]; empty: boolean }) {
  const syms = useSymbolMap();
  const navigate = useNavigate();
  const { data } = useRules();
  if (empty || !list.length) return <div className="state"><span className="ic"><Ic name="star" /></span><h3>관심 종목이 아직 없어요</h3><p>종목 화면에서 별표를 누르면 여기에 모여요. 관심 종목 뉴스는 알림함으로도 받아요.</p><div className="actions"><button className="btn primary" onClick={act.focusSearch}>종목 검색</button></div></div>;
  const ruleN = (s: string) => (data?.items ?? []).filter(r => r.symbol === s).length;
  return <><div className="panel-head"><span className="t-label">관심 종목</span></div><div className="panel-body fill table-wrap"><table className="table"><thead><tr><th>종목</th><th className="r">현재가</th><th className="r">등락</th><th>규칙</th><th></th></tr></thead><tbody>
    {list.filter(s => syms[s]).map(s => { const st = syms[s], n = ruleN(s);
      return <tr key={s} className="row-link" onClick={e => { if (!(e.target as HTMLElement).closest("button")) navigate(`/stock?s=${s}`); }}><td><div className="sym"><Mark symbol={s} color={st.color} /><div><b>{st.nameKo}</b><small>{s}</small></div></div></td><td className="r">{fmt.usd(st.price)}</td><td className={`r ${tone(st.changePercent)}`}>{pct(st.changePercent)}</td><td className="muted">{n ? `${n}개` : "없음"}</td>
        <td className="r"><button className="btn sm ghost" onClick={() => act.unwatch(s)}>관심 해제</button></td></tr>; })}</tbody></table></div></>;
}

function HoldingsTab({ act, fmt, holdings, total }: { act: Actions; fmt: Fmt; holdings: Holding[]; total: number }) {
  const syms = useSymbolMap();
  const rows = holdings.map(h => { const pl = (h.price - h.avgPrice) * h.qty, r = (h.price / h.avgPrice - 1) * 100, val = h.price * h.qty; return { h, pl, r, val }; }).sort((a, b) => b.pl - a.pl);
  return <><div className="panel-head"><span className="t-label">보유 종목</span><span className="spacer"></span><span className="tag fresh">실시간 평가</span></div>
    <div className="panel-body fill table-wrap"><table className="table"><thead><tr><th>종목</th><th className="r">수량</th><th className="r">평균 단가</th><th className="r">현재가</th><th className="r">평가 금액</th><th className="r" aria-sort="descending"><button>손익 <Ic name="sort" /></button></th><th className="r">비중</th><th></th></tr></thead><tbody>
      {rows.map(({ h, pl, r, val }) => <tr key={h.symbol}>
        <td><Link className="sym" to={`/stock?s=${h.symbol}`}><Mark symbol={h.symbol} color={syms[h.symbol]?.color} /><div><b>{h.nameKo ?? h.symbol}</b><small>{h.symbol}</small></div></Link></td><td className="r">{h.qty}주</td><td className="r">{fmt.usd(h.avgPrice)}</td><td className="r">{fmt.usd(h.price)}</td>
        <td className="r">{fmt.usd(val)}<div className="t-caption">{fmt.alt(val)}</div></td><td className={`r ${tone(pl)}`}>{pl >= 0 ? "+" : ""}{fmt.usd(pl)}<div style={{ fontSize: 12.5 }}>{pct(r)}</div></td><td className="r">{total ? (val / total * 100).toFixed(0) : 0}%</td>
        <td className="r"><div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}><button className="btn sm outline" onClick={() => act.rule({ s: h.symbol })}>규칙</button><button className="btn sm sell" onClick={() => act.order({ s: h.symbol, side: "sell" })}>매도</button></div></td></tr>)}
    </tbody></table></div></>;
}
