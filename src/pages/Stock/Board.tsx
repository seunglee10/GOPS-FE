/* 종목 화면 기본 모드: 패널 보드. 목업 gops.js 1761~1798(배치 나무), 1936~1964(패널·편집 메뉴), 1967~2006(끌어 옮기기·경계선 끌기).
   패널은 ⋮⋮ 를 끌어 다른 패널 위에 놓으면 자리를 바꾸고, 경계선을 끌어 크기를 바꾸고, 탭으로 내용을 더하거나 뺀다.
   배치는 이 브라우저(gops.layout)에만 저장하고 '패널 편집 > 초기화'로 처음 배치로 돌린다.
   미국 주식이라 국내 전용 데이터(외국인·기관 순매수 등)는 미국에서 공개되는 것(기관 보유, 내부자 거래, 공매도)으로 바꿨다 */
import { useCallback, useRef, useState, type DragEvent, type PointerEvent as RPointerEvent } from "react";
import { Ic } from "../../app/icons";
import { KEYS, prefs } from "../../app/store";
import type { Actions } from "../../app/shell/actions";
import { useKeepOpen } from "./StockHead";
import { AiPanels } from "./ai";
import { BookPanel, FactsPanel, InstPanel, NewsItems, OrderInline, ShortPanel, TicksPanel } from "./panels";
import { StockChart } from "./StockChart";
import { useStockUi, type StockData } from "./data";

export const PANEL_TYPES = { chart: "차트", book: "호가", order: "주문", ticks: "시세", inst: "기관·내부자", short: "공매도", ai: "AI 분석", news: "뉴스", facts: "핵심 지표" } as const;
export type PanelType = keyof typeof PANEL_TYPES;
/* 배치는 나눔 나무: 가로 나눔(row)의 크기는 비율, 세로 나눔(col)의 크기도 비율로 저장한다 */
type LayNode = string | { d: "row" | "col"; k: { s: number; n: LayNode }[] };
type Panels = Record<string, { tabs: PanelType[]; act: number }>;
type Board = { lay: LayNode; panels: Panels };
const LAYOUT_DEFAULT: LayNode = { d: "row", k: [
  { s: 0.76, n: { d: "col", k: [
    { s: 390, n: { d: "row", k: [{ s: 0.62, n: "a" }, { s: 0.38, n: "b" }] } },
    { s: 390, n: { d: "row", k: [{ s: 1, n: "d" }, { s: 1, n: "e" }, { s: 1, n: "f" }] } }] } },
  { s: 0.24, n: "c" }] };
const PANELS_DEFAULT: Panels = { a: { tabs: ["chart"], act: 0 }, b: { tabs: ["book"], act: 0 }, c: { tabs: ["order"], act: 0 }, d: { tabs: ["ai"], act: 0 }, e: { tabs: ["ticks"], act: 0 }, f: { tabs: ["inst", "short"], act: 0 } };
/* 패널 편집: 그룹별로 패널을 켜고 끈다 */
const PANEL_GROUPS: [string, PanelType[]][] = [["차트·호가", ["chart", "book", "order"]], ["투자 동향", ["ticks", "inst", "short"]], ["분석·정보", ["ai", "news", "facts"]]];
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const layoutStore = prefs.json<Board>(KEYS.layout);
const isType = (t: string): t is PanelType => t in PANEL_TYPES;

function loadBoard(): Board {
  try {
    const v = layoutStore.get();
    if (v && v.lay && v.panels) {
      const P = v.panels;
      for (const k in P) { P[k].tabs = P[k].tabs.filter(isType); P[k].act = Math.min(P[k].act, P[k].tabs.length - 1); }
      if (Object.values(P).every(x => x.tabs.length)) return v;
    }
  } catch { /* 저장된 값이 깨졌으면 기본 배치 */ }
  return { lay: clone(LAYOUT_DEFAULT), panels: clone(PANELS_DEFAULT) };
}
const usedTypes = (P: Panels) => new Set(Object.values(P).flatMap(p => p.tabs));
const nodeAt = (lay: LayNode, path: number[]) => path.reduce<LayNode>((n, i) => (n as Exclude<LayNode, string>).k[i].n, lay) as Exclude<LayNode, string>;
/* 패널을 빼면 그 크기를 옆 칸이 가져가고, 하나만 남은 나눔은 접는다 */
function removeLeaf(B: Board, pid: string) {
  const walk = (node: LayNode, parent: Exclude<LayNode, string> | null, pi: number): boolean => {
    if (typeof node === "string") return false;
    const i = node.k.findIndex(k => k.n === pid);
    if (i >= 0) { const sz = node.k[i].s; node.k.splice(i, 1); if (node.k.length) node.k[Math.min(i, node.k.length - 1)].s += sz; if (node.k.length === 1 && parent) parent.k[pi].n = node.k[0].n; return true; }
    return node.k.some((k, j) => walk(k.n, node, j));
  };
  walk(B.lay, null, 0); delete B.panels[pid];
  if (typeof B.lay !== "string" && B.lay.k.length === 1 && typeof B.lay.k[0].n !== "string") B.lay = B.lay.k[0].n;
}
/* 새 패널은 맨 아래 줄 끝에 붙인다 */
function addLeaf(B: Board, pid: string) {
  let host: Exclude<LayNode, string> | null = null;
  const find = (n: LayNode) => { if (typeof n === "string") return; if (n.d === "col") { const last = n.k[n.k.length - 1].n; if (typeof last !== "string" && last.d === "row") host = last; } n.k.forEach(k => find(k.n)); };
  find(B.lay); if (!host && typeof B.lay !== "string" && B.lay.d === "row") host = B.lay;
  if (!host) { B.lay = { d: "row", k: [{ s: 3, n: B.lay }, { s: 1, n: pid }] }; return; }
  const h = host as Exclude<LayNode, string>;
  h.k.push({ s: h.k.length ? h.k.reduce((a, k) => a + k.s, 0) / h.k.length : 1, n: pid });
}

/* 칸 하나가 더 줄어들 수 없는 크기. 패널 하나면 CSS 최소값(가로 220·세로 340)이고, 안에 또 분할이 있으면 같은 방향은 합, 다른 방향은 최댓값 */
const LAYK_MIN = { w: 220, h: 340 };
function laykMin(k: Element, row: boolean): number {
  const c = k.firstElementChild; if (!c || !c.classList.contains("lay")) return row ? LAYK_MIN.w : LAYK_MIN.h;
  const kids = [...c.children].filter(x => x.classList.contains("lay-k")), ms = kids.map(x => laykMin(x, row));
  return c.classList.contains("lay-row") === row ? ms.reduce((a, b) => a + b, 0) + 12 * (kids.length - 1) : Math.max(...ms);
}

export function BoardPage({ D, act, head, tabs }: { D: StockData; act: Actions; head: React.ReactNode; tabs: React.ReactNode }) {
  const [B, setB] = useState<Board>(loadBoard);
  const [bpm, setBpm] = useState<string | null>(null), [edit, setEdit] = useState(false);
  const ui = useStockUi();
  useKeepOpen(!!bpm || edit, () => { setBpm(null); setEdit(false); });
  const commit = useCallback((fn: (b: Board) => void) => setB(prev => { const n = clone(prev); fn(n); layoutStore.set(n); return n; }), []);
  const dragFrom = useRef<string | null>(null);

  /* 호가 줄의 매도·매수: 주문 패널이 있으면 그 탭을 열고 가격을 채운다. 없으면 주문 시트 */
  const bookOrder = (side: "buy" | "sell", price: string) => {
    const pid = Object.keys(B.panels).find(k => B.panels[k].tabs.includes("order"));
    if (!pid) { act.order({ s: D.s, price, side }); return; }
    if (act.requireLogin("order")) return;
    ui.setOi({ side, type: "limit", price });
    commit(b => { b.panels[pid].act = b.panels[pid].tabs.indexOf("order"); });
    ui.bumpFlash();
  };

  const body = (t: PanelType) => {
    switch (t) {
      case "chart": return <div className="bp-chart"><StockChart D={D} act={act} board /></div>;
      case "book": return <BookPanel D={D} onOrder={bookOrder} />;
      case "order": return <OrderInline D={D} act={act} />;
      case "ticks": return <TicksPanel D={D} />;
      case "inst": return <InstPanel D={D} />;
      case "short": return <ShortPanel D={D} />;
      case "ai": return <div className="bp-ai"><AiPanels D={D} act={act} /></div>;
      case "news": return <div className="news"><NewsItems s={D.s} n={8} /></div>;
      case "facts": return <FactsPanel D={D} />;
    }
  };

  /* ---------- 끌어 옮기기: 두 패널 내용이 자리를 바꾼다 ---------- */
  const onDragStart = (pid: string) => (e: DragEvent<HTMLSpanElement>) => {
    dragFrom.current = pid; e.dataTransfer.setData("text/plain", pid); e.dataTransfer.effectAllowed = "move";
    const bp = e.currentTarget.closest<HTMLElement>(".bp"); if (bp) { e.dataTransfer.setDragImage(bp, 24, 18); setTimeout(() => bp.classList.add("dragging"), 0); }
  };
  const clearDrag = () => document.querySelectorAll(".bp.dragging, .bp.over").forEach(x => x.classList.remove("dragging", "over"));
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    const t = e.currentTarget; if (!dragFrom.current || t.classList.contains("dragging")) return;
    e.preventDefault(); document.querySelectorAll(".bp.over").forEach(x => x !== t && x.classList.remove("over")); t.classList.add("over");
  };
  const onDrop = (to: string) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault(); const from = dragFrom.current; dragFrom.current = null; clearDrag();
    if (!from || from === to) return;
    commit(b => { if (!b.panels[from] || !b.panels[to]) return; [b.panels[from], b.panels[to]] = [b.panels[to], b.panels[from]]; });
  };

  /* ---------- 경계선 끌기: 끌리는 동안 두 칸이 같이 늘고 줄고, 놓으면 비율로 저장 ---------- */
  const onSplit = (path: number[], i: number) => (e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sp = e.currentTarget, node = nodeAt(B.lay, path), row = node.d === "row";
    const ka = sp.previousElementSibling as HTMLElement, kb = sp.nextElementSibling as HTMLElement; if (!ka || !kb) return;
    const ra = ka.getBoundingClientRect(), rb = kb.getBoundingClientRect();
    const pxA = row ? ra.width : ra.height, pxB = row ? rb.width : rb.height, minA = laykMin(ka, row), minB = laykMin(kb, row), a0 = node.k[i].s, b0 = node.k[i + 1].s;
    ka.classList.add(row ? "rz-r" : "rz-b"); kb.classList.add(row ? "rz-l" : "rz-t");
    let d = 0, raf = 0; const x0 = e.clientX, y0 = e.clientY;
    const apply = () => { ka.style.flex = `0 0 ${pxA + d}px`; kb.style.flex = `0 0 ${pxB - d}px`; raf = 0; };
    sp.classList.add("on"); document.body.classList.add(row ? "col-resizing" : "row-resizing");
    const move = (ev: PointerEvent) => { d = row ? ev.clientX - x0 : ev.clientY - y0; d = Math.max(minA - pxA, Math.min(pxB - minB, d)); if (!raf) raf = requestAnimationFrame(apply); };
    const up = () => {
      document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up);
      if (raf) cancelAnimationFrame(raf);
      ka.classList.remove("rz-r", "rz-b"); kb.classList.remove("rz-l", "rz-t"); sp.classList.remove("on"); document.body.classList.remove("col-resizing", "row-resizing");
      ka.style.flex = ""; kb.style.flex = "";
      const sum = a0 + b0, fa = sum * (pxA + d) / (pxA + pxB);
      commit(b => { const n = nodeAt(b.lay, path); n.k[i].s = fa; n.k[i + 1].s = sum - fa; });
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  };

  const used = usedTypes(B.panels);
  const panel = (pid: string) => {
    const pn = B.panels[pid]; if (!pn) return null;
    const t = pn.tabs[pn.act] || pn.tabs[0];
    return <section className="bp panel" data-pid={pid} onDragOver={onDragOver} onDragLeave={e => e.currentTarget.classList.remove("over")} onDrop={onDrop(pid)}>
      <div className="bp-head"><span className="bp-grip" draggable onDragStart={onDragStart(pid)} onDragEnd={() => { dragFrom.current = null; clearDrag(); }} title="끌어서 옮기기">⋮⋮</span>
        {pn.tabs.map((k, i) => <span key={k} className="bp-tab" role="tab" aria-selected={i === pn.act} onClick={() => commit(b => { b.panels[pid].act = i; })}>{PANEL_TYPES[k]}
          <span className="x" role="button" aria-label={`${PANEL_TYPES[k]} 닫기`} onClick={e => { e.stopPropagation(); commit(b => { const p = b.panels[pid]; p.tabs.splice(i, 1); p.act = Math.min(p.act, p.tabs.length - 1); if (!p.tabs.length) removeLeaf(b, pid); }); }}>×</span></span>)}
        <span className="bp-addwrap"><button className="bp-add keepopen" onClick={() => { setBpm(bpm === pid ? null : pid); setEdit(false); }} aria-label="패널 더하기">+</button>
          {bpm === pid ? <div className="bp-menu keepopen">{(Object.keys(PANEL_TYPES) as PanelType[]).filter(k => !used.has(k)).map(k => <button key={k} onClick={() => { commit(b => { const p = b.panels[pid]; p.tabs.push(k); p.act = p.tabs.length - 1; }); setBpm(null); }}>{PANEL_TYPES[k]}</button>)}
            {used.size >= Object.keys(PANEL_TYPES).length ? <p>더할 수 있는 패널이 없어요. 모든 패널이 화면에 있어요.</p> : null}</div> : null}</span></div>
      <div className={`bp-body bp-${t}`}>{body(t)}</div></section>;
  };
  const lay = (node: LayNode, path: number[]): React.ReactNode => {
    if (typeof node === "string") return panel(node);
    return <div className={`lay lay-${node.d}`}>{node.k.map((kid, i) => <Frag key={typeof kid.n === "string" ? kid.n : `n${i}`}>
      {i ? <div className={`split split-${node.d === "row" ? "v" : "h"}`} onPointerDown={onSplit(path, i - 1)} title="끌어서 크기 바꾸기"><i></i></div> : null}
      <div className="lay-k" style={{ flex: `${kid.s} 1 0` }}>{lay(kid.n, path.concat(i))}</div></Frag>)}</div>;
  };
  const toggle = (t: PanelType) => commit(b => {
    const pid = Object.keys(b.panels).find(k => b.panels[k].tabs.includes(t));
    if (pid) { const pn = b.panels[pid], i = pn.tabs.indexOf(t); pn.tabs.splice(i, 1); pn.act = Math.max(0, Math.min(pn.act, pn.tabs.length - 1)); if (!pn.tabs.length) removeLeaf(b, pid); }
    else { const id = "p" + Date.now(); b.panels[id] = { tabs: [t], act: 0 }; addLeaf(b, id); }
  });
  const reset = () => { const n = { lay: clone(LAYOUT_DEFAULT), panels: clone(PANELS_DEFAULT) }; setB(n); layoutStore.set(n); setEdit(false); act.toast("패널을 기본 모드로 되돌렸어요."); };
  return <div className="sboard">{head}
    <div className="sb-tabs">{tabs}<span className="spacer"></span>
      <div className="sb-editwrap"><button className="btn sm ghost keepopen" onClick={() => { setEdit(!edit); setBpm(null); }} aria-expanded={edit}>패널 편집 <Ic name="chevR" /></button>
        {edit ? <div className="bp-menu right pe keepopen" role="group" aria-label="패널 편집">
          {PANEL_GROUPS.map(([g, ks]) => <div key={g} className="pe-g"><small>{g}</small>{ks.map(k => <button key={k} className="pe-it" onClick={() => toggle(k)} aria-pressed={used.has(k)}><span className="pe-ck"><Ic name="check" /></span>{PANEL_TYPES[k]}</button>)}</div>)}
          <div className="pe-foot"><button className="pe-it" onClick={reset}><Ic name="refresh" />초기화</button></div></div> : null}</div></div>
    <div className="board" id="board">{lay(B.lay, [])}</div></div>;
}
function Frag({ children }: { children: React.ReactNode }) { return <>{children}</>; }
