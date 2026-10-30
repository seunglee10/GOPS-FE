/* 종목 화면의 떠 있는 용어 카드(?term=). 목업 gops.js termCardHTML(1378)·placeTermCard(1388).
   카드 내용과 본문은 사이드바 '용어 풀이'와 같은 렌더러(src/app/shell/learn/termCard)를 쓴다 */
import { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../app/icons";
import { useFormat } from "../../app/format";
import { termCard, TermInner, type TermData } from "../../app/shell/learn/termCard";
import { useCourse } from "../../data/hooks";
import { sharesKo } from "../common";
import type { StockData } from "./data";

/** 종목 화면 데이터를 용어 카드 입력으로 */
export function termDataOf(D: StockData): TermData | null {
  const { F, C, levels } = D;
  if (!F || !levels || C.length < 22) return null;
  return { symbol: D.s, C, price: D.summary?.price ?? D.p, per: F.per, sper: F.sper, lo: F.lo, hi: F.hi, x: F.x, vol: sharesKo(F.volShares), sup: levels.sup, res: levels.res,
    peers: (D.summary?.peers ?? []).filter(p => p.per != null).map(p => [p.symbol, p.per as number] as [string, number]) };
}

/** ?term= 으로 여는 떠 있는 카드. 누른 자리가 없으면 화면 가운데 위쪽에 붙인다 */
export function TermCard({ D, termKey, onClose }: { D: StockData; termKey: string; onClose: () => void }) {
  const fmt = useFormat(D.fx);
  const course = useCourse();
  const ref = useRef<HTMLDivElement>(null);
  const TD = useMemo(() => termDataOf(D), [D]);
  const c = TD ? termCard(termKey, TD, fmt.usd) : null;
  const learn = course.data?.questions.filter(q => q.topic === termKey).length ?? 0;
  useLayoutEffect(() => {
    const card = ref.current; if (!card) return;
    const a = document.querySelector(`[data-term="${CSS.escape(termKey)}"]`);
    const r = a ? a.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: 120, bottom: 120 }, w = card.offsetWidth, h = card.offsetHeight;
    let x = r.left - w - 12; if (x < 12) x = Math.min(r.right + 12, innerWidth - w - 12);
    card.style.left = Math.max(12, x) + "px";
    card.style.top = Math.max(72, Math.min(r.top - 24, innerHeight - h - 12)) + "px";
  });
  if (!c) return null;
  return <div className="termcard" id="termcard" ref={ref} role="dialog" aria-label={`${c.title} 읽는 법`}>
    <div className="tc-head"><div><span className="t-label">{c.title}</span>{c.value ? <b>{c.value}</b> : null}{c.sub ? <small>{c.sub}</small> : null}</div><button className="iconbtn" onClick={onClose} aria-label="닫기"><Ic name="x" /></button></div>
    <TermInner c={c} />
    {learn ? <Link className="tc-learn" to={`/course?topic=${termKey}`}><span><b>실전 차트로 확인하기</b><small>{learn}개</small></span><Ic name="chevR" /></Link> : null}
  </div>;
}
