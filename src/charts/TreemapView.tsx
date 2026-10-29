import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { bigMoney } from "./format";
import { focusTreemap, hoverInfoHTML, renderTreemap, type TreemapPeriod, type TreemapSector } from "./treemap";
import type { Currency } from "./types";

export type TreemapProps = {
  /** [섹터 이름, [[티커, 시가총액(십억 달러), 기간 등락률], ...]] */
  sectors: TreemapSector[];
  /** 홈은 늘 1일. 시장 화면은 1일·1주·1개월 */
  mode?: "home" | "full";
  period?: TreemapPeriod;
  logoUrl: (symbol: string) => string | null;
  logoBg?: (symbol: string) => string | null;
  markColor?: (symbol: string) => string;
  nameKo: (symbol: string) => string;
  /** 마우스 정보 줄의 현재가 (달러). 없으면 가격을 뺀다 */
  price?: (symbol: string) => number | null;
  fx?: number;
  cur$?: Currency;
  href?: (symbol: string) => string;
  /** 밝힐 섹터 이름 */
  focus?: string | null;
  dark?: boolean;
  /** 칸을 눌렀을 때. preventDefault 하면 링크로 가지 않는다 */
  onSelect?: (symbol: string, e: MouseEvent<HTMLElement>) => void;
};

/** S&P 500 지도. .treemap-wrap > .treemap + .hoverinfo 구조는 목업과 같다 */
export function Treemap(p: TreemapProps) {
  const map = useRef<HTMLDivElement>(null), info = useRef<HTMLDivElement>(null);
  const period = p.mode === "home" ? "" : (p.period ?? "");
  const { sectors, logoUrl, logoBg, markColor, href, dark, focus } = p;
  const isDark = dark ?? (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark");
  const draw = useCallback(() => {
    const el = map.current; if (!el) return;
    const { width, height } = el.getBoundingClientRect(); if (!width || !height) return;
    el.innerHTML = renderTreemap({ sectors, width, height, period, logoUrl, logoBg, markColor, href, dark: isDark });
    focusTreemap(el, focus);
  }, [sectors, period, logoUrl, logoBg, markColor, href, isDark, focus]);
  useEffect(() => {
    draw();
    const el = map.current; if (!el || typeof ResizeObserver === "undefined") { window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }
    let raf = 0; const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }); ro.observe(el);
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [draw]);
  const over = (e: MouseEvent<HTMLElement>) => {
    const hi = info.current; if (!hi) return;
    const c = (e.target as Element).closest<HTMLElement>(".cell");
    if (!c) { hi.hidden = true; return; }
    const s = c.dataset.sym ?? "", pr = p.price?.(s) ?? null, cur = p.cur$ ?? "krw", fx = p.fx ?? 1;
    hi.hidden = false;
    hi.innerHTML = hoverInfoHTML(s, +(c.dataset.d ?? 0), p.nameKo(s), pr != null ? (cur === "krw" ? `₩${Math.round(pr * fx).toLocaleString("ko-KR")}` : `$${pr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : null, bigMoney(+(c.dataset.v ?? 0), cur, fx));
  };
  const click = (e: MouseEvent<HTMLElement>) => { const c = (e.target as Element).closest<HTMLElement>(".cell"); if (c && p.onSelect) p.onSelect(c.dataset.sym ?? "", e); };
  return <div className="treemap-wrap" onMouseOver={over} onMouseLeave={() => { if (info.current) info.current.hidden = true; }} onClick={click}>
    <div className="treemap" ref={map} />
    <div className="hoverinfo" ref={info} hidden />
  </div>;
}
export default Treemap;
