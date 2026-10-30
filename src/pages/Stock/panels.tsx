/* 패널 보드의 패널 내용. 목업 gops.js bookRows(1865), tickRows(1878), orderInline(1884), panelBody(1900~1935) */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { krw, pct, tone, useFormat } from "../../app/format";
import type { Actions } from "../../app/shell/actions";
import { rsiParts } from "../../charts";
import { useNews, useOrder } from "../../data/hooks";
import { newsHref, sharesKo } from "../common";
import { md, r2, tickStep, useStockUi, type StockData } from "./data";

const NoData = () => <div className="state" style={{ minHeight: 160 }}><p>이 종목은 해당 데이터를 제공하지 않아요</p></div>;
const hhmmss = (t: Date) => [t.getHours(), t.getMinutes(), t.getSeconds()].map(v => String(v).padStart(2, "0")).join(":");

/* ---------- 호가: 한 줄 = [매도 버튼 | 매도 잔량 | 가격 | 매수 잔량 | 매수 버튼] ---------- */
export function BookPanel({ D, onOrder }: { D: StockData; onOrder: (side: "buy" | "sell", price: string) => void }) {
  const fmt = useFormat(D.fx);
  const bodyRef = useRef<HTMLDivElement>(null);
  const B = D.live?.book ?? [];
  /* 처음 열 때 현재가 줄이 가운데 오게 (목업 render 3316) */
  useEffect(() => {
    const bk = bodyRef.current?.closest<HTMLElement>(".bp-body"); if (!bk) return;
    /* 보드 크기가 자리 잡는 동안에도 가운데를 지키고, 사람이 직접 스크롤하면 그 자리를 둔다 */
    let touched = false;
    const center = () => { const now = bk.querySelector<HTMLElement>(".bk-row.now"); if (!touched && now) bk.scrollTop = now.offsetTop - bk.clientHeight / 2 + now.offsetHeight / 2; };
    const mine = () => { touched = true; };
    center();
    const ro = new ResizeObserver(center); ro.observe(bk);
    bk.addEventListener("wheel", mine, { passive: true }); bk.addEventListener("pointerdown", mine);
    return () => { ro.disconnect(); bk.removeEventListener("wheel", mine); bk.removeEventListener("pointerdown", mine); };
  }, [D.s, B.length > 0]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!B.length) return <div className="bk"><div className="state" style={{ minHeight: 160 }}><p>호가 정보가 아직 없어요</p></div></div>;
  const p = D.p, step = tickStep(p), base = Math.round(p / step) * step, pc = D.pc, mx = Math.max(...B), half = Math.floor(B.length / 2);
  const row = (pr: number, qn: number, ask: boolean, i: number) => <div key={`${ask ? "a" : "b"}${i}`} className={`bk-row ${ask ? "ask" : "bid"} ${Math.abs(pr - p) < step / 2 ? "now" : ""}`}>
    <button className="bk-btn sell" onClick={() => onOrder("sell", pr.toFixed(2))} aria-label={`${pr.toFixed(2)}달러에 매도`}>매도</button>
    <span className="bk-q ask">{ask ? <><i style={{ width: `${qn / mx * 100}%` }}></i><b>{qn.toLocaleString()}</b></> : null}</span>
    <span className={`bk-p ${tone(pr - pc)}`}><b>{fmt.krwMode ? Math.round(pr * D.fx).toLocaleString("ko-KR") : pr.toFixed(2)}</b><small>{pct((pr - pc) / pc * 100)}</small></span>
    <span className="bk-q bid">{ask ? null : <><i style={{ width: `${qn / mx * 100}%` }}></i><b>{qn.toLocaleString()}</b></>}</span>
    <button className="bk-btn buy" onClick={() => onOrder("buy", pr.toFixed(2))} aria-label={`${pr.toFixed(2)}달러에 매수`}>매수</button></div>;
  const asks = B.slice(0, half), bids = B.slice(half);
  const ta = asks.reduce((a, x) => a + x, 0), tb = bids.reduce((a, x) => a + x, 0);
  return <div className="bk" ref={bodyRef}><div className="bk-head"><span></span><span>매도 잔량</span><span>가격</span><span>매수 잔량</span><span></span></div><div id="book-body">
    {asks.map((qn, i) => row(r2(base + (half - i) * step), qn, true, i))}{bids.map((qn, i) => row(r2(base - i * step), qn, false, i))}
    <div className="bk-sum"><span></span><span className="down">{ta.toLocaleString()}</span><small>매도 잔량 · 매수 잔량</small><span className="up">{tb.toLocaleString()}</span><span></span></div></div></div>;
}

/* ---------- 시세: 실시간 체결 / 일별 ---------- */
export function TicksPanel({ D }: { D: StockData }) {
  const fmt = useFormat(D.fx);
  const [mode, setMode] = useState<"live" | "day">("live");
  const pc = D.pc, C = D.C;
  let cum = D.live?.volume ?? 0;
  return <>
    <div className="seg block sm" role="group"><button aria-pressed={mode === "live"} onClick={() => setMode("live")}>실시간</button><button aria-pressed={mode === "day"} onClick={() => setMode("day")}>일별</button></div>
    {mode === "live" ? <table className="table tk"><thead><tr><th>체결가</th><th className="r">체결량(주)</th><th className="r">등락률</th><th className="r">거래량(주)</th><th className="r">시간(ET)</th></tr></thead><tbody id="ticks-body">
      {(D.live?.ticks ?? []).map((x, i) => { const c = cum; cum -= x.q; return <tr key={i}><td>{fmt.usd(x.p)}</td><td className={`r ${x.up ? "up" : "down"}`}>{x.q}</td><td className={`r ${tone(x.p - pc)}`}>{pct((x.p - pc) / pc * 100)}</td><td className="r">{c.toLocaleString()}</td><td className="r muted">{hhmmss(x.t)}</td></tr>; })}</tbody></table>
      : <table className="table tk"><thead><tr><th>날짜</th><th className="r">종가</th><th className="r">등락률</th><th className="r">거래량</th></tr></thead><tbody>{C.slice(-20).reverse().map((d, i) => { const prev = C[C.length - 2 - i]; const ch = (d.c / prev.c - 1) * 100;
        return <tr key={i}><td>{md(d.t)}</td><td className="r">{fmt.usd(d.c)}</td><td className={`r ${tone(ch)}`}>{pct(ch)}</td><td className="r">{Math.round(d.v * 1e5).toLocaleString()}</td></tr>; })}</tbody></table>}
  </>;
}

/* ---------- 주문 (패널 안에서 바로) ---------- */
export function OrderInline({ D, act }: { D: StockData; act: Actions }) {
  const fmt = useFormat(D.fx);
  const ui = useStockUi(), { oi } = ui;
  const { place } = useOrder();
  const priceBox = useRef<HTMLDivElement>(null), qtyIn = useRef<HTMLInputElement>(null);
  const price = oi.price != null ? +oi.price : D.p, qty = +oi.qty || 0, buy = oi.side === "buy";
  const held = D.holding?.qty ?? 0, cash = D.cash ?? 0;
  /* 호가나 차트에서 가격을 넘겨받으면 가격 칸을 잠깐 반짝이고, 수량이 비었으면 수량 칸으로 */
  useEffect(() => {
    if (!ui.flash) return;
    const box = priceBox.current; box?.classList.add("flash");
    const t = setTimeout(() => box?.classList.remove("flash"), 900);
    if (!(+oi.qty)) qtyIn.current?.focus();
    return () => clearTimeout(t);
  }, [ui.flash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const step = (k: "price" | "qty", v: number) => {
    if (k === "price") { if (oi.type === "market") return; ui.setOi({ price: String(r2(price + v * tickStep(D.p))) }); }
    else ui.setOi({ qty: String(Math.max(0, qty + v)) });
  };
  const submit = async () => {
    if (act.requireLogin("oi-submit") || !(qty > 0) || place.pending) return;
    try { await place.run({ symbol: D.s, side: oi.side, type: oi.type, qty, price: oi.type === "market" ? null : price, memo: null }); }
    catch { act.toast("주문을 넣지 못했어요. 브로커가 10초 안에 응답하지 않았어요.", { error: true, action: "다시 시도" }); return; }
    ui.setOi({ qty: "" });
    act.toast(`${buy ? "구매" : "판매"} 주문을 넣었어요. 체결을 기다리는 중이에요.`, { action: "주문 내역", href: "/portfolio?tab=orders" });
  };
  return <div className="oi">
    <div className="seg block" role="group" aria-label="주문 방향"><button className="is-buy" aria-pressed={buy} onClick={() => ui.setOi({ side: "buy" })}>구매</button><button className="is-sell" aria-pressed={!buy} onClick={() => ui.setOi({ side: "sell" })}>판매</button></div>
    <div className="oi-f"><span className="label">주문 유형</span><div className="seg block"><button aria-pressed={oi.type === "limit"} onClick={() => ui.setOi({ type: "limit" })}>지정가</button><button aria-pressed={oi.type === "market"} onClick={() => ui.setOi({ type: "market" })}>시장가</button></div></div>
    <div className="oi-f"><span className="label">{buy ? "구매" : "판매"} 가격</span><div className="oi-step"><div className="input" ref={priceBox}><input data-oi="price" value={oi.type === "market" ? "시장가" : oi.price ?? price.toFixed(2)} disabled={oi.type === "market"} inputMode="decimal" onChange={e => ui.setOi({ price: e.target.value })} /><span className="unit">USD</span></div>
      <button className="iconbtn" onClick={() => step("price", -1)} aria-label="가격 내리기">−</button><button className="iconbtn" onClick={() => step("price", 1)} aria-label="가격 올리기">+</button></div></div>
    <div className="oi-f"><span className="label">수량</span><div className="oi-step"><div className="input"><input data-oi="qty" ref={qtyIn} value={oi.qty} placeholder="수량 입력" inputMode="numeric" onChange={e => ui.setOi({ qty: e.target.value })} /><span className="unit">주</span></div>
      <button className="iconbtn" onClick={() => step("qty", -1)} aria-label="수량 줄이기">−</button><button className="iconbtn" onClick={() => step("qty", 1)} aria-label="수량 늘리기">+</button></div>
      <div className="oi-pcts">{[10, 25, 50, 100].map(x => <button key={x} className="btn sm outline" onClick={() => ui.setOi({ qty: String(Math.floor((buy ? cash / price : held) * x / 100)) })}>{x === 100 ? "최대" : x + "%"}</button>)}</div></div>
    <div className="oi-sum"><span>총 주문 금액</span><b id="oi-total">{fmt.usd(price * qty)}</b></div>
    <p className="oi-cash">{buy ? `주문 가능 금액 ${fmt.usd(cash)}` : `보유 ${held}주`}</p>
    <button className={`btn lg block ${buy ? "buy" : "sell"}${place.pending ? " is-loading" : ""}`} onClick={submit} {...(qty > 0 ? {} : { "aria-disabled": "true", "data-tip": "수량을 1주 이상 입력해 주세요." })}>{buy ? "구매하기" : "판매하기"}</button>
    <p className="oi-note">버튼을 눌러야만 주문이 들어가요. 모의투자 계좌예요.</p>
  </div>;
}

/* ---------- 기관·내부자 / 공매도: 데이터가 없는 소스는 '제공하지 않아요' ---------- */
export function InstPanel({ D }: { D: StockData }) {
  const fmt = useFormat(D.fx), f = D.flows;
  if (!f) return D.flowsLoading ? null : <NoData />;
  const ch = f.institutionalChangePp;
  return <div className="ix"><div className="ix-big"><div><small>기관 보유 비중</small><b>{f.institutionalPercent.toFixed(1)}%</b><span className={tone(ch)}>지난 분기보다 {ch > 0 ? "+" : ""}{ch.toFixed(1)}%p</span></div><div><small>보유 기관 수</small><b>{f.institutionCount.toLocaleString()}곳</b></div></div>
    <p className="ix-note">기관 보유는 분기마다 공개돼요 (SEC 13F). 내부자 거래는 거래 후 2영업일 안에 공개돼요.</p>
    <div className="dw-sub"><b>내부자 거래</b><small>최근 90일</small></div>
    <table className="table tk"><thead><tr><th>날짜</th><th>직책</th><th>구분</th><th className="r">주식 수</th><th className="r">금액</th></tr></thead><tbody>{f.insiderTrades.map((t, i) => <tr key={i}><td>{t.date}</td><td>{t.role}</td><td className={t.side === "buy" ? "up" : "down"}>{t.side === "buy" ? "매수" : "매도"}</td><td className="r">{t.shares.toLocaleString()}</td><td className="r">{fmt.usd(t.shares * (D.summary?.price ?? D.p), 0)}</td></tr>)}</tbody></table></div>;
}
export function ShortPanel({ D }: { D: StockData }) {
  const f = D.flows;
  if (!f) return D.flowsLoading ? null : <NoData />;
  const all = [...f.shortHistory, f.shortPercent], mx = Math.max(...all);
  return <div className="ix"><div className="ix-big"><div><small>공매도 비율</small><b>{f.shortPercent.toFixed(2)}%</b><span className="muted">유통 주식 대비</span></div><div><small>커버 일수</small><b>{f.daysToCover.toFixed(1)}일</b><span className="muted">평균 거래량 기준</span></div><div><small>대차 수수료</small><b>{f.borrowFeePercent.toFixed(2)}%</b><span className="muted">연</span></div></div>
    <p className="ix-note">공매도 잔고는 거래소가 한 달에 두 번 공개해요.</p>
    <div className="sh-bars">{all.map((v, i) => { const lastI = all.length - 1; return <div key={i}><i style={{ height: `${v / mx * 70}px` }} className={i === lastI ? "on" : ""}></i><small>{i === lastI ? "최근" : `${lastI - i}회 전`}</small></div>; })}</div></div>;
}

/* ---------- 핵심 지표 ---------- */
export function FactsPanel({ D }: { D: StockData }) {
  const fmt = useFormat(D.fx), F = D.F;
  if (!F || !D.C.length) return null;
  const price = D.summary?.price ?? D.p;
  return <div className="statgrid">
    <div><small>시가총액</small><b>{fmt.bigMoney(F.capB)}</b><span className="s" style={{ display: "block" }}>{krw(F.capB * D.fx / 1000)}조</span></div>
    <div><small>PER (선행)</small><b>{F.per.toFixed(1)}배</b><span className="s" style={{ display: "block" }}>섹터 {F.sper.toFixed(1)}배</span></div>
    <div><small>52주 범위</small><b>{fmt.usd(F.lo, 1)}~{fmt.usd(F.hi, 1)}</b><span className="s" style={{ display: "block" }}>고점 {((price / F.hi - 1) * 100).toFixed(1)}%</span></div>
    <div><small>거래량</small><b className={F.x >= 1.5 ? "up" : ""}>{sharesKo(F.volShares)}</b><span className="s" style={{ display: "block" }}>평균의 {F.x.toFixed(1)}배</span></div>
    <div><small>RSI(14)</small><b>{rsiParts(D.C).v.toFixed(1)}</b><span className="s" style={{ display: "block" }}>14일 중 오른 쪽 비율</span></div>
    <div><small>캔들</small><b className={D.d >= 0 ? "up" : "down"}>{D.d >= 0 ? "양봉" : "음봉"}</b><span className="s" style={{ display: "block" }}>마지막 날 모양</span></div></div>;
}

/* ---------- 뉴스 목록: 이 종목과 엮인 기사 ---------- */
export function NewsItems({ s, n }: { s: string; n: number }) {
  const news = useNews({ symbols: [s], limit: n });
  const items = news.data?.items ?? [];
  if (!items.length) return news.loading ? null : <div className="state" style={{ minHeight: 120, gridColumn: "1/-1" }}><p>이 종목과 관련된 뉴스가 아직 없어요.</p></div>;
  return <>{items.map(it => <Link key={it.id} className="nitem" to={newsHref(it)}><h4>{it.titleKo}</h4><div className="meta"><span>{it.source}</span><span>{it.relativeKo}</span></div></Link>)}</>;
}
