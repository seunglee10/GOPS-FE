/* 사이드바 '용어 풀이': 사전 목록과 용어 카드. 목업 gops.js drawerLearn(1698~1718).
   카드 그림은 종목 화면이면 그 종목, 다른 화면이면 엔비디아(NVDA) 차트로 그린다 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../icons";
import { useFormat } from "../../format";
import { TERM_NAME } from "../../../data/terms";
import { useCandles, useCourse, useLevels, useStockSummary } from "../../../data/hooks";
import { useSymbolMap } from "../useSymbolMap";
import type { Actions } from "../actions";
import type { PageKey } from "../../nav";
import { termCard, TermInner, type TermData } from "./termCard";
import { useTopicCounts, useTopicHighlight } from "./topics";

/* 오늘 거래량 표기: 억·만 주 */
const volKo = (v: number) => { const man = Math.round(v / 1e4); return man >= 10000 ? `${(man / 10000).toFixed(2)}억 주` : `${man.toLocaleString("ko-KR")}만 주`; };

export function DrawerLearn({ page, act }: { page: PageKey; act: Actions }) {
  const syms = useSymbolMap();
  const raw = (act.q("s") || "NVDA").toUpperCase(), s = page === "stock" && syms[raw] ? raw : "NVDA";
  const lterm = act.q("lterm"), key = lterm && TERM_NAME[lterm] ? lterm : null;
  const course = useCourse();
  const [hover, setHover] = useState<string | null>(null);
  const all = Object.keys(TERM_NAME);
  const chartTopics = page === "stock" && (act.q("tab") || "chart") === "chart" ? ["candle", "vol", "sup"] : [];
  const cnt = useTopicCounts(all, chartTopics);
  useTopicHighlight(hover || key, !hover && !!key);
  const nQ = (t: string) => (course.data?.questions ?? []).filter(c => c.topic === t).length;

  if (key) return <TermPanel k={key} s={s} page={page} act={act} here={cnt[key] ?? 0} nQ={nQ(key)} />;
  const ctx = all.filter(t => cnt[t] > 0), rest = all.filter(t => !cnt[t]);
  const row = (t: string) => <button key={t} className="lp-row" data-topic={t} onClick={() => act.set("lterm", t)} onMouseEnter={() => setHover(t)} onMouseLeave={() => setHover(null)}>
    <span className="t">{TERM_NAME[t]}{cnt[t] ? <small>화면에 {cnt[t]}곳</small> : null}</span><Ic name="chevR" /></button>;
  return <><div className="dw-head"><b>용어 풀이</b><span className="spacer"></span></div>
    <div className="dw-body">
      {ctx.length ? <><div className="dw-sub"><b>이 화면에 나온 용어</b><small>마우스를 올리면 화면에 표시돼요</small></div>{ctx.map(row)}</> : null}
      <div className="dw-sub"><b>{ctx.length ? "다른 용어" : "전체 용어"}</b></div>{rest.map(row)}
    </div></>;
}

function TermPanel({ k, s, page, act, here, nQ }: { k: string; s: string; page: PageKey; act: Actions; here: number; nQ: number }) {
  const fmt = useFormat();
  const candles = useCandles(s, "D"), summary = useStockSummary(s), levels = useLevels(s);
  const D = useMemo<TermData | null>(() => {
    const C = candles.data, S = summary.data, L = levels.data;
    if (!C || !S || !L || C.length < 22) return null;
    return { symbol: s, C: C.slice(-84), price: S.price, per: S.per ?? 0, sper: S.sectorPer ?? 0, lo: S.low52 ?? S.price, hi: S.high52 ?? S.price,
      x: S.volumeRatio20d ?? 1, vol: S.volume != null ? volKo(S.volume) : "-", sup: L.sup, res: L.res, peers: S.peers.filter(p => p.per != null).map(p => [p.symbol, p.per as number]) };
  }, [candles.data, summary.data, levels.data, s]);
  const c = D ? termCard(k, D, fmt.usd) : null;
  return <><div className="dw-head"><button className="iconbtn lp-back" onClick={() => act.set("lterm", "")} aria-label="목록으로"><Ic name="chevR" /></button><b>{c?.title ?? TERM_NAME[k]}</b>{c?.value ? <span className="lp-val">{c.value}</span> : null}<span className="spacer"></span></div>
    <div className="dw-body lp-term">
      {here ? <p className="lp-where"><i></i>지금 화면에서 파란 테두리로 표시한 곳이에요.</p> : null}
      {page !== "stock" ? <p className="lp-where muted">그림은 엔비디아(NVDA) 차트로 보여 드려요.</p> : null}
      {c ? <TermInner c={c} /> : null}
      {nQ ? <Link className="lp-row lp-course" to={`/course?topic=${k}`}><span className="t"><b>실전 차트로 확인하기</b><small>{nQ}개</small></span><Ic name="chevR" /></Link> : null}
    </div></>;
}
