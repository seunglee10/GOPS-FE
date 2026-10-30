/* 종목 머리말. 목업 gops.js stockHead(1835): 이름(누르면 종목 고르기), 실시간 가격, 통화, 핵심 숫자, 가격 알림 팝오버(1841~1845), 관심 하트 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../app/icons";
import { Mark } from "../../app/shell/Mark";
import { CurSeg } from "../../app/shell/Drawer";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { pct, tone, useFormat } from "../../app/format";
import type { Actions } from "../../app/shell/actions";
import { useQuickAlert } from "../../data/hooks";
import { r2, type StockData } from "./data";

/* 바깥을 누르면 닫히는 작은 메뉴들. 목업 UI.pick/alert/bpm/edit 처럼 .keepopen 안을 누르면 그대로 둔다 */
export function useKeepOpen(open: boolean, close: () => void) {
  const ref = useRef(close); ref.current = close;
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => { if (!(e.target as Element).closest?.(".keepopen")) ref.current(); };
    const t = setTimeout(() => document.addEventListener("click", on), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", on); };
  }, [open]);
}

const RangeBar = ({ lo, hi, v }: { lo: number; hi: number; v: number }) => { const k = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))); return <span className="rb"><i style={{ left: `${k * 100}%` }}></i></span>; };

export function StockHead({ D, act }: { D: StockData; act: Actions }) {
  const { s, p, pc } = D;
  const fmt = useFormat(D.fx);
  const syms = useSymbolMap();
  const quick = useQuickAlert();
  const [pick, setPick] = useState(false), [alert, setAlert] = useState(false), [sel, setSel] = useState<Set<number>>(new Set()), [find, setFind] = useState(""), [own, setOwn] = useState("");
  useKeepOpen(pick || alert, () => { setPick(false); setAlert(false); });
  const pickIn = useRef<HTMLInputElement>(null);
  useEffect(() => { if (pick) pickIn.current?.focus(); else setFind(""); }, [pick]);
  const stars = act.starSet(), on = stars.has(s);
  const d = p - pc, last = D.C[D.C.length - 1], F = D.F, sm = D.summary, fl = D.flows;
  const alerts = [-10, -5, 5, 10].map(x => [x, r2(p * (1 + x / 100))] as const);
  const usdAbs = (v: number) => fmt.usd(Math.abs(v)).replace("-", "");
  const save = async () => {
    if (act.requireLogin("alert-save")) return;
    const prices = [...sel].map(x => r2(p * (1 + x / 100))).concat(own.trim() && +own ? [+own] : []);
    if (!prices.length) { act.toast("알림 받을 가격을 하나 이상 골라 주세요.", { error: true }); return; }
    try { await quick.run({ symbol: s, prices }); } catch { act.toast("가격 알림을 만들지 못했어요. 잠시 뒤 다시 해 주세요.", { error: true }); return; }
    setAlert(false); setSel(new Set()); setOwn("");
    act.toast(`가격 알림 ${prices.length}개를 만들었어요.`, { action: "규칙 보기", href: "/portfolio?tab=rules" });
  };
  const list = Object.values(syms).filter(x => { const v = find.trim().toLowerCase(); return !v || x.symbol.toLowerCase().includes(v) || `${x.nameKo ?? ""}${x.symbol}`.toLowerCase().includes(v); });
  return <div className="sh">
    <div className="sh-l">
      <div className="sh-namewrap"><button className="sh-name keepopen" onClick={() => { setPick(!pick); setAlert(false); }} aria-expanded={pick}><Mark symbol={s} color={D.color} /><b>{D.nameKo}</b><span className="muted">{s}</span><Ic name="chevR" /></button>
        {pick ? <div className="sh-drop keepopen"><div className="input"><input id="sh-pick-in" ref={pickIn} placeholder="종목명·티커 검색" autoComplete="off" value={find} onChange={e => setFind(e.target.value)} /></div>
          <div className="sh-list" id="sh-list">{list.map(x => <Link key={x.symbol} to={`/stock?s=${x.symbol}`} data-sym={x.symbol} onClick={() => setPick(false)}><Mark symbol={x.symbol} color={x.color} /><b>{x.nameKo}</b><small>{x.symbol}</small><span className={tone(x.changePercent)}>{pct(x.changePercent)}</span></Link>)}</div></div> : null}</div>
      <div className="sh-price"><b id="lv-price">{fmt.usd(p)}</b><span className="muted">어제보다</span><span id="lv-chg" className={tone(d)}>{d >= 0 ? "+" : "-"}{usdAbs(d)} ({pct(d / pc * 100)})</span><span className="muted" id="lv-krw">{fmt.alt(p)}</span><CurSeg /></div>
    </div>
    <div className="sh-stats">
      <dl><dt>1일 범위</dt><dd>{last ? <>{fmt.usd(last.l)} <RangeBar lo={last.l} hi={last.h} v={p} /> {fmt.usd(last.h)}</> : "-"}</dd><dt>52주 범위</dt><dd>{F ? <>{fmt.usd(F.lo)} <RangeBar lo={F.lo} hi={F.hi} v={p} /> {fmt.usd(F.hi)}</> : "-"}</dd></dl>
      <dl><dt>거래대금</dt><dd>{sm?.dollarVolume ? fmt.bigMoney(sm.dollarVolume / 1e9) : "-"}</dd><dt>체결강도</dt><dd id="lv-str">{D.live ? `${D.live.strength.toFixed(2)}%` : "-"}</dd></dl>
      <dl><dt>공매도 비율</dt><dd>{fl ? `${fl.shortPercent.toFixed(2)}%` : "-"}</dd><dt>기관 보유</dt><dd>{fl ? `${fl.institutionalPercent.toFixed(1)}%` : "-"}</dd></dl>
      <dl><dt>시가총액 순위</dt><dd>{sm?.marketCapRank ? `${sm.marketCapRank}위` : "-"}</dd><dt>시가총액</dt><dd>{F ? fmt.bigMoney(F.capB) : "-"}</dd></dl>
    </div>
    <div className="sh-acts">
      <div className="sh-alertwrap"><button className="iconbtn keepopen" onClick={() => { setAlert(!alert); setPick(false); }} aria-expanded={alert} aria-label="가격 알림" data-tip="가격 알림"><Ic name="bell" /></button>
        {alert ? <div className="sh-alert keepopen" role="dialog" aria-label="가격 알림"><h3>가격 알림</h3><p>지금 가격 {fmt.usd(p)} 기준으로 골라 두었어요.</p>
          <div className="al-list">{alerts.map(([x, v]) => <button key={x} className="al-it" onClick={() => setSel(o => { const n = new Set(o); if (n.has(x)) n.delete(x); else n.add(x); return n; })} aria-pressed={sel.has(x)}><span className={x < 0 ? "down" : "up"}>{x > 0 ? "+" : ""}{x}%</span><b>{fmt.usd(v)}</b><small>{x < 0 ? "이하로 내려가면" : "이상으로 오르면"}</small></button>)}</div>
          <div className="field"><label htmlFor="al-in">직접 입력</label><div className="input"><input id="al-in" inputMode="decimal" placeholder={p.toFixed(2)} value={own} onChange={e => setOwn(e.target.value)} /><span className="unit">USD</span></div></div>
          <div className="al-acts"><button className="linkbtn" onClick={() => act.rule({ s })}>조건을 더 정하려면 규칙 만들기</button><span className="spacer"></span><button className={`btn primary sm${quick.pending ? " is-loading" : ""}`} onClick={save}>알림 받기</button></div></div> : null}</div>
      <button className="iconbtn" onClick={() => act.star(s)} aria-pressed={on} aria-label="관심 종목" data-tip={on ? "관심 종목에서 빼기" : "관심 종목에 추가"}><Ic name={on ? "heartFill" : "heart"} /></button>
    </div>
  </div>;
}
