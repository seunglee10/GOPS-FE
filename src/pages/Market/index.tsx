/* S&P 500 화면. 목업 gops.js pageMarket(623). 지도가 한 화면을 다 쓴다.
   제목 옆 지수 값은 홈 맨 위 지수(S&P 500)와 같은 값. 1주·1개월 지수 등락은 종목 기간 등락의 시가총액 가중 평균 */
import { useMemo, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePage } from "../../app/shell/Shell";
import { useQ } from "../../app/query";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { pct, tone, useCurrency } from "../../app/format";
import { MAP_PERIODS, Treemap, heat, type TreemapPeriod } from "../../charts";
import { useFx, useHeatmap, useIndices } from "../../data/hooks";
import { useMapColors, mapLogoUrl, sectorsOf, wavg } from "../common";

const stockHref = (s: string) => `/stock?s=${s}`;
const SINCE: Record<TreemapPeriod, string> = { "": "어제보다", "1w": "1주 전보다", "1m": "1개월 전보다" };

export default function MarketPage() {
  usePage("market");
  const { q, setQ } = useQ();
  const navigate = useNavigate();
  const heatmap = useHeatmap(), idx = useIndices(), fx = useFx(), syms = useSymbolMap(), { krwMode } = useCurrency();
  const mc = useMapColors(syms);
  const p: TreemapPeriod = q("mp") === "1w" || q("mp") === "1m" ? q("mp") as TreemapPeriod : "";
  const max = MAP_PERIODS.find(([k]) => k === p)![2];
  const sectors = useMemo(() => sectorsOf(heatmap.data?.items ?? [], p), [heatmap.data, p]);
  const nameOf = useMemo(() => Object.fromEntries((heatmap.data?.items ?? []).map(i => [i.symbol, i.nameKo])), [heatmap.data]);
  const spx = idx.data?.items.find(i => i.symbol === "^GSPC");
  const chg = p ? wavg(sectors.flatMap(([, t]) => t)) : spx?.changePercent ?? 0;
  const lv = spx ? spx.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const onSelect = (s: string, e: MouseEvent<HTMLElement>) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(stockHref(s)); };
  return <div className="grid market" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
    <section className="panel">
      <div className="panel-head"><span className="t-title-md">S&amp;P 500</span><span className="mk-lv">{lv}</span><span className={`mk-chg ${tone(chg)}`}>{pct(chg)}</span><span className="t-caption">{SINCE[p]}</span>{p ? null : <span className="tag fresh">장 마감</span>}<span className="spacer"></span>
        <div className="seg" role="group" aria-label="기간">{MAP_PERIODS.map(([k, t]) => <button key={k} aria-pressed={p === k} onClick={() => setQ({ mp: k })}>{t}</button>)}</div>
        <div className="legend">-{max}%{[-max, -max / 2, 0, max / 2, max].map(v => <i key={v} style={{ background: heat(v, max, document.documentElement.dataset.theme === "dark") }}></i>)}+{max}%</div></div>
      <Treemap sectors={sectors} mode="full" period={p} logoUrl={mapLogoUrl} logoBg={mc.logoBg} markColor={mc.markColor} href={stockHref}
        nameKo={s => nameOf[s] || syms[s]?.nameKo || s} price={s => syms[s]?.price ?? null} fx={fx.data?.rate || undefined} cur$={krwMode ? "krw" : "usd"} onSelect={onSelect} />
    </section>
  </div>;
}
