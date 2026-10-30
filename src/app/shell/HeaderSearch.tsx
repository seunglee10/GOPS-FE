/* 헤더 검색: 종목 이동 전용 (질문과 명령은 AI 패널). 목업 gops.js 345~363줄과 키보드 처리 3471~3480줄 */
import { useEffect, useRef, useState } from "react";
import { Ic } from "../icons";
import { pct, tone, useFormat } from "../format";
import { Mark } from "./Mark";
import { useSymbolSearch } from "../../data/hooks/useSymbolSearch";
import { useSymbolMap } from "./useSymbolMap";
import { RECENT_SEARCHES } from "../../data/mock/user";
import type { Actions } from "./actions";
import { useDataSource } from "../../data/source";
import { SkeletonRows } from "./LoadState";

export function HeaderSearch({ act }: { act: Actions }) {
  const hq = act.q("hq");
  const [value, setValue] = useState(hq ?? "");
  const [focused, setFocused] = useState(hq != null);
  const [hsel, setHsel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  const fmt = useFormat();
  const syms = useSymbolMap();
  const { results, hot } = useSymbolSearch(value);
  const list = value.trim() ? (results.data?.items ?? []) : [];
  const mock = useDataSource().kind === "mock";
  useEffect(() => { if (hq != null) setTimeout(() => inp.current?.focus(), 50); }, [hq]);
  const goStock = (s: string) => { setValue(""); setFocused(false); inp.current?.blur(); act.go(`/stock?s=${s}`); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && list.length) { e.preventDefault(); setHsel((hsel + 1) % list.length); }
    else if (e.key === "ArrowUp" && list.length) { e.preventDefault(); setHsel((hsel - 1 + list.length) % list.length); }
    else if (e.key === "Enter" && list.length) { e.preventDefault(); goStock(list[hsel].symbol); }
    else if (e.key === "Escape") { setValue(""); inp.current?.blur(); }
  };
  const hotItems = hot.data?.items ?? [];
  const name = (k: { nameKo: string | null; companyName: string; symbol: string }) => k.nameKo || k.companyName || k.symbol;
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const menu = !focused ? null : !value.trim() ? (
    <div className="menu" role="listbox">
      {mock ? <><div className="grp" style={{ display: "flex" }}>최근 검색<span style={{ flex: 1 }}></span><button className="linkbtn" style={{ fontSize: 12, width: "auto", height: "auto", padding: 0 }}>모두 지우기</button></div>
        <div className="chiprow">{RECENT_SEARCHES.map(t => <span key={t} className="tag">{t} <Ic name="x" /></span>)}</div></> : null}
      {hot.loading && !hot.data ? <><div className="grp">많이 찾는 종목</div><div style={{ padding: "0 10px 8px" }}><SkeletonRows n={3} h={28} /></div></>
        : hotItems.length ? <><div className="grp">많이 찾는 종목</div>{hotItems.map((k, i) => <button key={k.symbol} onMouseDown={keep} onClick={() => goStock(k.symbol)}><span className="rk" style={{ width: 16, color: "var(--brand)", fontWeight: 700 }}>{i + 1}</span><span className="sym"><Mark symbol={k.symbol} color={syms[k.symbol]?.color} /></span><span><b style={{ fontWeight: 600 }}>{name(k)}</b> <span className="muted">{k.symbol}</span></span>{k.price > 0 ? <small className={tone(k.changePercent)}>{pct(k.changePercent)}</small> : null}</button>)}</>
        : <div className="grp" style={{ padding: "10px 10px 8px", lineHeight: 1.5 }}>종목명이나 티커를 입력해 보세요.</div>}
    </div>
  ) : (
    <div className="menu" role="listbox"><div className="grp">종목</div>{list.length ? list.map((s, i) => <button key={s.symbol} role="option" onMouseDown={keep} onClick={() => goStock(s.symbol)} aria-selected={i === hsel} style={i === hsel ? { background: "var(--control)" } : undefined}><span className="sym"><Mark symbol={s.symbol} color={syms[s.symbol]?.color} /></span><span><b style={{ fontWeight: 600 }}>{name(s)}</b> <span className="muted">{s.symbol}</span></span>{s.price > 0 ? <small className={tone(s.changePercent)}>{fmt.usd(s.price)} {pct(s.changePercent)}</small> : null}</button>)
      : results.loading ? <div className="grp" style={{ padding: "10px 10px 8px" }} aria-busy="true">찾는 중이에요</div>
      : results.error ? <><div className="grp" style={{ padding: "10px 10px 8px", lineHeight: 1.5 }}>검색하지 못했어요.</div><button onMouseDown={keep} onClick={results.reload}><Ic name="search16" /><span>다시 시도</span></button></>
      : <><div className="grp" style={{ padding: "10px 10px 8px", lineHeight: 1.5 }}>“{value}”에 맞는 종목이 없어요. 궁금한 점이라면 AI에게 물어보세요.</div><button onMouseDown={keep} onClick={() => { const v = value; setValue(""); act.setQ({ agent: "new", ask: v, hq: null }); }}><Ic name="spark" /><span>“{value}” AI에게 묻기</span></button></>}</div>
  );
  return (
    <div className="hsearch" id="hsearch">
      <label><Ic name="search16" /><input id="hsearchinput" ref={inp} autoComplete="off" placeholder="종목명·티커 검색" aria-label="종목 검색" value={value}
        onChange={e => { setValue(e.target.value); setHsel(0); }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onKeyDown={onKey} /></label>
      <div id="hsearchmenu">{menu}</div>
    </div>
  );
}
