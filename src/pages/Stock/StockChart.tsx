/* 종목 차트. 차트 모듈(src/charts mountMainChart)에 훅 데이터와 설정을 넘기고, 차트 안 버튼(data-act)을 화면 행동으로 잇는다.
   목업 drawChart(2502)·CHS(2263)·cxSave·CX_DRAW 와 같은 저장 키(gops.chart, gops.draw)를 쓴다 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChartView, DEFAULT_CHART_SETTINGS, type ChartSettings, type Drawing, type RefLine } from "../../charts";
import type { CandleInterval } from "../../api/types";
import { useCandles, useChartEvents, useCourse } from "../../data/hooks";
import { KEYS, prefs } from "../../app/store";
import { useCurrency } from "../../app/format";
import type { Actions } from "../../app/shell/actions";
import { useStockUi, type StockData } from "./data";

const chartStore = prefs.json<Partial<ChartSettings>>(KEYS.chart);
const drawStore = prefs.json<Record<string, Drawing[]>>(KEYS.draw);
const loadSettings = (): ChartSettings => ({ ...DEFAULT_CHART_SETTINGS, ...(chartStore.get() ?? {}) });

/* 목업 data-href 는 파일 이름(course.html?topic=sup). 앱 경로로 바꾼다 */
const appHref = (h: string) => "/" + h.replace(/^\/+/, "").replace(/^index\.html/, "").replace(/\.html/, "");

export function StockChart({ D, act, board }: { D: StockData; act: Actions; board: boolean }) {
  const { s } = D;
  const navigate = useNavigate();
  const { krwMode } = useCurrency();
  const ui = useStockUi();
  const [settings, setSettings] = useState<ChartSettings>(loadSettings);
  const [drawMap, setDrawMap] = useState<Record<string, Drawing[]>>(() => drawStore.get() ?? {});
  const bars = useCandles(s, settings.iv as CandleInterval);
  const ev = useChartEvents(s);
  const course = useCourse();
  const supCourses = course.data?.questions.filter(c => c.topic === "sup").length ?? 0;
  const events = useMemo(() => (ev.data?.events ?? []).map(e => ({ t: e.t, k: e.k, title: e.title, ...(e.newsId ? { n: Number(/(\d+)$/.exec(e.newsId)?.[1] ?? NaN) } : {}) })), [ev.data]);
  const upcoming = useMemo(() => (ev.data?.upcoming ?? []).map(u => ({ t: u.at, title: u.title, earn: u.mine })), [ev.data]);
  const refLines = useMemo<RefLine[]>(() => {
    if (!D.F) return [];
    const out: RefLine[] = [];
    if (ui.refs.hi52) out.push({ k: "hi52", label: "52주 고점", p: D.F.hi });
    if (ui.refs.avg && D.holding) out.push({ k: "avg", label: "내 평단", p: D.holding.avgPrice });
    if (ui.refs.lo52) out.push({ k: "lo52", label: "52주 저점", p: D.F.lo });
    return out;
  }, [D.F, D.holding, ui.refs]);
  const levels = useMemo(() => D.levels && (ui.refs.sup || ui.refs.res) ? { sup: D.levels.sup, res: D.levels.res } : null, [D.levels, ui.refs.sup, ui.refs.res]);
  const drawings = drawMap[s] ?? [];
  const onSettings = useCallback((next: ChartSettings) => {
    setSettings(next);
    const { iv, type, ma, maOn, volN, panes, levels: lv, hilo, colors, magnet } = next;
    chartStore.set({ iv, type, ma, maOn, volN, panes, levels: lv, hilo, colors, magnet });
  }, []);
  const onDrawings = useCallback((next: Drawing[]) => {
    setDrawMap(m => { const v = { ...m, [s]: next }; drawStore.set(v); return v; });
  }, [s]);
  const onAction = useCallback((a: string, d: Record<string, string> = {}) => {
    switch (a) {
      case "set": act.setQ({ [d.k]: d.v || null }); break;
      case "pop": act.setQ({ pop: act.q("pop") === "1" ? null : "1", term: null }); break;
      case "rule-res": if (D.levels) act.rule({ s, price: D.levels.res, dir: "above" }); break;
      case "rule": act.rule({ s: d.s || s, price: d.price, dir: d.dir }); break;
      case "order": {
        /* 크게 보기에서는 오른쪽 주문 칸에 가격을 채운다 (목업 3412~3418) */
        if (act.q("view") === "chart" && (act.q("tab") || "chart") === "chart" && (!d.s || d.s === s)) {
          if (act.requireLogin("order")) return;
          ui.setOi({ side: d.side === "sell" ? "sell" : "buy", type: "limit", price: d.price || null }); act.setQ({ rp: null, pop: null }); ui.bumpFlash(); break;
        }
        act.order({ s: d.s || s, price: d.price, side: d.side === "sell" ? "sell" : "buy" }); break;
      }
      case "ask-level": act.askLevel(); break;
      case "go": if (d.href) navigate(appHref(d.href)); break;
      case "news": navigate(`/news?n=${encodeURIComponent(`n_${d.n}`)}`); break;
      case "toast": if (d.msg) act.toast(d.msg); break;
    }
  }, [act, D.levels, s, navigate, ui]);
  if (!bars.data || !D.daily.length) return <div className="chartbox" />;
  return <ChartView sym={s} bars={bars.data} daily={D.daily} cur={D.p} settings={settings} drawings={drawings} events={events} upcoming={upcoming} today={D.asOf}
    levels={levels} refLines={refLines} fx={D.fx} cur$={krwMode ? "krw" : "usd"} hl={act.q("hl") === "1"} board={board} pop={act.q("pop") === "1"} supCourses={supCourses}
    onSettings={onSettings} onDrawings={onDrawings} onAction={onAction} />;
}
