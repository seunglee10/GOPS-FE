/* 홈 화면. 목업 gops.js pageHome(861) = homeMarkets(739) + S&P 500 지도(drawTreemap 896, secRows 846) + homeTable(681) + homeNews(2168).
   처음 들어온 사람에게는 '용어 풀이' 둘러보기(TOUR 1605, 3322)를 한 번 띄운다 */
import { useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useActions } from "../../app/shell/actions";
import { CurSeg } from "../../app/shell/Drawer";
import { LetterMark, Mark } from "../../app/shell/Mark";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Ic } from "../../app/icons";
import { krw, pct, tone, useCurrency, useFormat } from "../../app/format";
import { useSession } from "../../app/session";
import { Treemap, miniSpark } from "../../charts";
import { useAccount, useCalendar, useFx, useGuardrails, useHeatmap, useIndices, useMarketClock, useMovers, useNews } from "../../data/hooks";
import type { MoversSort } from "../../api/types";
import { PTitle, newsHref, useMapColors, mapLogoUrl, sectorsOf, sharesKo, wavg } from "../common";
import { Tour } from "./Tour";

const stockHref = (s: string) => `/stock?s=${s}`;
/* 달러 → 십억 달러. 부동소수 오차로 1조가 9,999억이 되지 않게 유효숫자 15자리에서 자른다 */
const toB = (usd: number) => +(usd / 1e9).toPrecision(15);

export default function HomePage() {
  usePage("home");
  return <div className="home">
    <HomeMarkets />
    <SpxBlock />
    <HomeTable />
    <HomeNews />
    <Tour />
  </div>;
}

/* ---------- 맨 위 시장 지수: 세 줄씩 세 묶음 + 오른쪽 주요 일정 ---------- */
const MKT_COLS = [3, 3, 2];
function HomeMarkets() {
  const idx = useIndices(), clock = useMarketClock();
  const { brief } = useCalendar({ from: "2026-10-01", to: "2026-10-31" });
  const items = idx.data?.items ?? [];
  const cols: typeof items[] = []; let at = 0;
  for (const n of MKT_COLS) { cols.push(items.slice(at, at + n)); at += n; }
  if (at < items.length) cols.push(items.slice(at));
  const num = (v: number) => Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const val = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="mkt-wrap"><section className="panel mkt" aria-label="주요 지수">
    <div className="mkt-head">{(clock.data?.sessions ?? []).map(s => <span key={s.label}><i className="ok-dot"></i>{s.label} <small>{s.open} ~ {s.close}</small></span>)}</div>
    <div className="mkt-body">
      {cols.map((col, c) => <div className="mkt-col" key={c}>{col.map((it, i) => {
        const spike = it.flag === "spike", flag = spike ? null : it.flag;
        return <div className="mkt-it" key={it.symbol}>
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: miniSpark(21 + c * 3 + i, it.change >= 0, spike ? "spike" : undefined) }} />
          <div className="mkt-tx"><div className="mkt-n"><span>{it.nameKo}</span>{flag ? <span className="mkt-tag hot">{flag}</span> : null}{it.why ? <span className="mkt-tag">{it.why}</span> : null}</div>
            <div className="mkt-v"><b>{val(it.value)}</b><span className={tone(it.change)}>{it.change >= 0 ? "+" : "-"}{num(it.change)} ({num(it.changePercent)}%)</span></div></div></div>;
      })}</div>)}
    </div></section>
    <section className="panel mkt-cal" aria-label="주요 일정"><Link className="mkt-cal-t" to="/calendar">주요 일정<Ic name="chevR" /></Link>
      <p>{brief.data?.text}</p>
      <ul>{(brief.data?.upcoming ?? []).map(e => <li key={e.title}><b>{+e.date.slice(8)}일</b><span>{e.title}</span></li>)}</ul></section>
  </div>;
}

/* ---------- S&P 500 지도 + 섹터별 등락 ---------- */
function SpxBlock() {
  const heat = useHeatmap(), syms = useSymbolMap(), fx = useFx(), { krwMode } = useCurrency();
  const mc = useMapColors(syms);
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  /* 섹터 줄에 마우스를 올리면 지도에서 그 섹터를 미리 밝힌다. 줄 밖으로 나가면 고른 섹터로 돌아간다 */
  const [hov, setHov] = useState<string | null>(null);
  const sectors = useMemo(() => sectorsOf(heat.data?.items ?? []), [heat.data]);
  const nameOf = useMemo(() => Object.fromEntries((heat.data?.items ?? []).map(i => [i.symbol, i.nameKo])), [heat.data]);
  const rows = sectors.map(([n, t]) => [n, t, wavg(t)] as const).sort((a, b) => b[2] - a[2]);
  const onSelect = (s: string, e: MouseEvent<HTMLElement>) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(stockHref(s)); };
  return <section className="panel spx">
    <div className="panel-head"><PTitle t="S&P 500" to="/market" /></div>
    <div className="spx-body">
      <div className="spx-map">
        <Treemap sectors={sectors} mode="home" logoUrl={mapLogoUrl} logoBg={mc.logoBg} markColor={mc.markColor} href={stockHref} focus={hov ?? sel}
          nameKo={s => nameOf[s] || syms[s]?.nameKo || s} price={s => syms[s]?.price ?? null} fx={fx.data?.rate || undefined} cur$={krwMode ? "krw" : "usd"} onSelect={onSelect} /></div>
      <div className="spx-sec" onMouseOver={e => setHov((e.target as Element).closest<HTMLElement>(".secrow")?.dataset.n ?? null)} onMouseLeave={() => setHov(null)}><div className="spx-sub"><b>섹터별 등락</b><span className="t-caption">시가총액 가중 평균</span></div>
        <div className="spx-rows" id="secrows">{rows.map(([n, t, v]) => {
          const w = Math.min(Math.abs(v) / 1.6 * 50, 50), on = sel === n;
          const movers = on ? [...t].sort((a, b) => Math.abs(b[2]) - Math.abs(a[2])).slice(0, 3) : [];
          const onMap = typeof document !== "undefined" && !!document.querySelector(`.spx-map .sector[data-sector="${CSS.escape(n)}"]`);
          return <div key={n} style={{ display: "contents" }}>
            <button className="secrow" data-n={n} onClick={() => setSel(on ? null : n)} aria-pressed={on}><span>{n}</span><span className="secbar"><i style={{ ...(v >= 0 ? { left: "50%" } : { right: "50%" }), width: `${w}%`, background: v >= 0 ? "var(--up)" : "var(--down)" }}></i></span><span className={`v ${tone(v)}`}>{pct(v)}</span></button>
            {on ? <div className="sec-movers"><span className="t-caption">많이 움직인 종목</span>{movers.map(([k, , d]) => <Link key={k} to={stockHref(k)}><Mark symbol={k} color={syms[k]?.color} /><b>{nameOf[k] || syms[k]?.nameKo || k}</b><small>{k}</small><span className={tone(d)}>{pct(d)}</span></Link>)}
              {onMap ? null : <p className="t-caption">시가총액이 작아 지도에는 나오지 않는 섹터예요.</p>}</div> : null}
          </div>;
        })}</div></div>
    </div>
  </section>;
}

/* ---------- 홈 종목 표: 실시간 순위·보유 종목·관심 종목 ---------- */
const MOVE_SORT: [string, string][] = [["", "거래대금"], ["vol", "거래량"], ["up", "급상승"], ["down", "급하락"]];
const SORT_OF: Record<string, MoversSort> = { "": "trade", vol: "volume", up: "up", down: "down" };
const MKT_PICK: [string, string][] = [["", "전체"], ["kr", "국내"], ["us", "해외"]];
const HT_TABS: [string, string][] = [["", "실시간 순위"], ["hold", "보유 종목"], ["watch", "관심 종목"]];
/* v1 은 미국 종목만: 국내는 메뉴에 보이되 고를 수 없다 */
const KR_OFF = "국내 시세는 준비 중이에요";

function HomeTable() {
  const act = useActions("home");
  const { q } = act;
  const { guest } = useSession();
  const fmt = useFormat();
  const syms = useSymbolMap();
  const navigate = useNavigate();
  const tab = !guest && (q("ht") === "hold" || q("ht") === "watch") ? q("ht")! : "", rank = tab === "";
  const mv = MOVE_SORT.some(([k]) => k && k === q("mv")) ? q("mv")! : "";
  const mk = q("mk") === "us" ? "us" : "";
  const movers = useMovers(rank ? SORT_OF[mv] : "trade", rank ? mk : "");
  const { summary } = useAccount();
  const guard = useGuardrails();
  const holdings = summary.data?.holdings ?? [];
  const held = Object.fromEntries(holdings.map(h => [h.symbol, h.qty]));
  const watch = act.starSet();
  const all = movers.data?.items ?? [];
  const rows = rank ? all : all.filter(it => tab === "hold" ? held[it.symbol] != null : watch.has(it.symbol));
  const mkName = MKT_PICK.find(([k]) => k === mk)![1];
  const empty = rank ? (mv === "up" ? "오늘 오른 종목이 없어요." : "오늘 내린 종목이 없어요.") : tab === "hold" ? "보유한 종목이 없어요." : "아직 관심 종목이 없어요. 하트를 누르면 여기에 모여요.";
  const chase = guard.data?.chaseBuyWarnPercent ?? null;
  const head = ["핵심 이슈", "차트 흐름"];
  return <section className="panel hometable">
    <div className="panel-head">
      {guest ? <span className="t-label">실시간 순위</span> : <div className="seg">{HT_TABS.map(([k, t]) => <button key={k} aria-pressed={tab === k} onClick={() => act.set("ht", k)}>{t}</button>)}</div>}
      <span className="spacer"></span>
      <CurSeg />
    </div>
    {rank ? <div className="ht-sort"><div className="ht-dd"><button className="ht-dd-btn" onClick={() => act.menu("mk")} aria-haspopup="listbox" aria-expanded={q("menu") === "mk"}>{mkName}<Ic name="chevR" /></button>
        {q("menu") === "mk" ? <div className="menu" role="listbox" style={{ left: 0, top: 36, minWidth: 120 }}>{MKT_PICK.map(([k, t]) => k === "kr"
          ? <button key={k} role="option" aria-selected={false} aria-disabled="true" disabled title={KR_OFF} style={{ color: "var(--muted-soft)", cursor: "not-allowed" }}>{t}</button>
          : <button key={k} role="option" aria-selected={mk === k} onClick={() => act.set("mk", k, { menu: null })}>{t}{mk === k ? <span className="me-n"><Ic name="check" /></span> : null}</button>)}</div> : null}</div>
      <div className="seg sm" role="group" aria-label="순위 기준">{MOVE_SORT.map(([k, t]) => <button key={k} aria-pressed={mv === k} onClick={() => act.set("mv", k)}>{t}</button>)}</div></div> : null}
    <div className="panel-body table-wrap"><table className="table">
      <thead><tr><th style={{ width: rank ? 72 : 40 }}>{rank ? "순위" : ""}</th><th>종목</th><th className="r">현재가</th><th className="r">등락률{rank && (mv === "up" || mv === "down") ? " 순" : ""}</th><th className="r">{rank && mv === "vol" ? "거래량" : "거래대금"}{rank && (mv === "" || mv === "vol") ? " 순" : ""}</th><th className="r">시가총액</th>{head.map((h, i) => <th key={h} className={i === 0 ? "gops-col" : ""}>{h}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((it, i) => {
        const k = it.symbol, kr = it.currency === "KRW", on = watch.has(k), name = it.nameKo || k;
        const sub = () => {
          if (kr || guest || held[k] == null) return k;
          const p = it.price, chg = held[k] * (p - p / (1 + it.changePercent / 100));
          return <span className="mine">보유 {held[k]}주, 오늘 <span className={tone(chg)}>{chg >= 0 ? "+" : "-"}{fmt.usd(Math.abs(chg))}</span></span>;
        };
        const go = kr ? undefined : (e: MouseEvent) => { if ((e.target as Element).closest("button, a")) return; navigate(stockHref(k)); };
        return <tr key={k} className={kr ? undefined : "row-link"} onClick={go}>
          <td className="muted"><span className="ht-rank"><button className="ht-heart" onClick={() => act.star(k)} aria-pressed={on} aria-label={`${name} ${on ? "관심 종목에서 빼기" : "관심 종목에 추가"}`}><Ic name="heartFill" /></button>{rank ? i + 1 : ""}</span></td>
          <td><div className="sym">{kr ? <LetterMark letter={name[0]} color={it.color || "#8894A6"} /> : <Mark symbol={k} color={syms[k]?.color ?? it.color} />}<div><b>{name}</b><small>{sub()}</small></div></div></td>
          <td className="r">{kr ? krw(it.price) : fmt.usd(it.price)}</td><td className="r"><span className={`chgbox ${tone(it.changePercent)}`}>{pct(it.changePercent)}</span></td>
          <td className="r">{rank && mv === "vol" ? sharesKo(it.volume ?? 0) : it.dollarVolume ? fmt.bigMoney(toB(it.dollarVolume)) : "-"}</td><td className="r">{it.marketCap != null ? fmt.bigMoney(toB(it.marketCap)) : "-"}</td>
          <td className="gops-col">{it.issue ? <span className="why1">{it.issue}</span> : <span className="muted">특별한 소식 없음</span>}</td>
          <td>{it.chartNote || "-"}{!guest && !kr && chase != null && it.changePercent > chase ? <> <span className="tag caution">급등일, 추격 매수 주의</span></> : null}</td></tr>;
      }) : <tr><td colSpan={6 + head.length}><div className="state" style={{ minHeight: 120 }}><p>{movers.loading ? "" : movers.error ? "순위를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." : empty}</p></div></td></tr>}</tbody>
    </table></div></section>;
}

/* ---------- 홈 뉴스: 내 종목(보유·관심) → 시장 전체(인기·최신) ---------- */
const NEWS_TABS: [string, string][] = [["hold", "보유 주식"], ["watch", "관심 주식"], ["hot", "인기 뉴스"], ["new", "최신 뉴스"]];

function HomeNews() {
  const act = useActions("home");
  const { guest } = useSession();
  const syms = useSymbolMap();
  const { summary } = useAccount();
  const tabs = guest ? NEWS_TABS.slice(2) : NEWS_TABS;
  const tab = tabs.some(([k]) => k === act.q("nt")) ? act.q("nt")! : tabs[0][0];
  const mine = new Set(tab === "hold" ? (summary.data?.holdings ?? []).map(h => h.symbol) : tab === "watch" ? act.starSet() : []);
  const mineKey = [...mine].sort().join(",");
  const ready = tab !== "hold" || !!summary.data;
  const news = useNews(useMemo(() => ({ ...(mineKey ? { symbols: mineKey.split(",") } : {}), sort: tab === "hot" ? "hot" as const : "new" as const, limit: 10 }), [mineKey, tab]));
  const items = ready ? news.data?.items ?? [] : [];
  return <section className="panel home-news">
    <div className="panel-head"><PTitle t="뉴스" to="/news" /><div className="seg">{tabs.map(([k, t]) => <button key={k} aria-pressed={tab === k} onClick={() => act.set("nt", k)}>{t}</button>)}</div></div>
    <div className="panel-body news">{items.length ? items.map(n => {
      const rel = n.relatedSymbols.filter(r => syms[r.symbol]).sort((a, b) => +mine.has(b.symbol) - +mine.has(a.symbol)).slice(0, 2);
      return <Link key={n.id} className="nitem" to={newsHref(n)}><h4>{n.titleKo}</h4><div className="meta"><span>{n.source}</span><span>{n.relativeKo}</span></div>
        {rel.length ? <div className="nrel">{rel.map(r => <span key={r.symbol}>{r.nameKo || syms[r.symbol]?.nameKo || r.symbol}</span>)}</div> : null}</Link>;
    }) : news.loading || !ready ? null : <div className="state" style={{ minHeight: 120, gridColumn: "1/-1" }}><p>{tab === "hold" ? "보유 종목과 관련된 뉴스가 아직 없어요." : "관심 종목과 관련된 뉴스가 아직 없어요."}</p></div>}</div></section>;
}
