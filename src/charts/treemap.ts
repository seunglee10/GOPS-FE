/* S&P 500 지도. 목업 gops.js의 squarify/heat/drawTreemap 을 입력을 받아 HTML 문자열을 만드는 꼴로 */
import { esc, pct, tone } from "./format";

export type TreemapItem = { v: number } & Record<string, unknown>;
export type TreemapCell<T> = T & { a: number; x: number; y: number; w: number; h: number };

/** 넓이 비례로 네모를 채우는 squarify. 큰 것부터 줄 단위로 놓는다 */
export function squarify<T extends TreemapItem>(items: T[], x: number, y: number, w: number, h: number): TreemapCell<T>[] {
  const tot = items.reduce((s, d) => s + d.v, 0), out: TreemapCell<T>[] = [];
  const arr = items.map(d => ({ ...d, a: d.v / tot * w * h })).sort((a, b) => b.a - a.a);
  let rx = x, ry = y, rw = w, rh = h, row: (T & { a: number })[] = [];
  const worst = (r: (T & { a: number })[], side: number) => { const s = r.reduce((t, e) => t + e.a, 0); return Math.max(...r.map(e => Math.max(side * side * e.a / (s * s), s * s / (side * side * e.a)))); };
  const place = (r: (T & { a: number })[]) => { const s = r.reduce((t, e) => t + e.a, 0);
    if (rw >= rh) { const cw = s / rh; let cy = ry; r.forEach(e => { const ch = e.a / cw; out.push({ ...e, x: rx, y: cy, w: cw, h: ch }); cy += ch; }); rx += cw; rw -= cw; }
    else { const ch = s / rw; let cx = rx; r.forEach(e => { const cw = e.a / ch; out.push({ ...e, x: cx, y: ry, w: cw, h: ch }); cx += cw; }); ry += ch; rh -= ch; } };
  let i = 0;
  while (i < arr.length) { const side = Math.min(rw, rh); if (!row.length || worst([...row, arr[i]], side) <= worst(row, side)) row.push(arr[i++]); else { place(row); row = []; } }
  if (row.length) place(row);
  return out;
}

/** 등락률 → 칸 색. max에서 가장 진해진다 */
export function heat(v: number, max = 3, dark = false) {
  const t = Math.min(Math.abs(v) / max, 1), mix = (a: number[], b: number[]) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const base = dark ? [58, 58, 58] : [166, 172, 181];
  const [r, g, b] = v >= 0 ? mix(base, [214, 48, 70]) : mix(base, [44, 108, 214]);
  return `rgb(${r},${g},${b})`;
}

/** 지도 기간: [키, 이름, 색이 가장 진해지는 등락률]. 기간이 길수록 움직임이 커서 색 기준도 넓힌다 */
export const MAP_PERIODS: [TreemapPeriod, string, number][] = [["", "1일", 3], ["1w", "1주", 6], ["1m", "1개월", 12]];
export type TreemapPeriod = "" | "1w" | "1m";
export const mapMax = (p: TreemapPeriod) => (MAP_PERIODS.find(([k]) => k === p) ?? MAP_PERIODS[0])[2];

/** 섹터: [이름, [[티커, 시가총액(십억 달러), 기간 등락률(%)], ...]] */
export type TreemapSector = [string, [string, number, number][]];

export type TreemapRenderOptions = {
  sectors: TreemapSector[];
  width: number;
  height: number;
  /** 기간. 등락률은 이미 그 기간 값으로 넘어온다. 색 기준(max)만 기간에 따라 바뀐다 */
  period?: TreemapPeriod;
  /** 로고 이미지 주소. 없으면(null) 회사 색 네모에 첫 글자 */
  logoUrl: (symbol: string) => string | null;
  /** 로고 네모 바탕색. 없으면 흰색 */
  logoBg?: (symbol: string) => string | null;
  /** 로고가 없을 때 쓰는 회사 색 */
  markColor?: (symbol: string) => string;
  /** 칸 링크 주소 */
  href?: (symbol: string) => string;
  dark?: boolean;
};

export type TreemapLayoutSector = { name: string; x: number; y: number; w: number; h: number; band: number; avg: number; cells: { s: string; v: number; d: number; x: number; y: number; w: number; h: number }[] };

/** 섹터·종목 배치만 계산 (이름을 쓸 수 없는 작은 종목·빈 섹터는 뺀다) */
export function layoutTreemap(sectors: TreemapSector[], W: number, H: number): TreemapLayoutSector[] {
  const SG = 4;                                       // 섹터 사이 간격 (종목 사이는 1px)
  const fits = (c: { w: number; h: number }) => c.w >= 42 && c.h >= 32;           // 티커와 등락률을 쓸 수 있는 최소 크기
  const wavg = (list: [string, number, number][]) => list.reduce((a, [, v, d]) => a + v * d, 0) / list.reduce((a, x) => a + x[1], 0);
  let secList = sectors.map(([n, t]) => ({ n, t, v: t.reduce((s, x) => s + x[1], 0) }));
  let layout: TreemapLayoutSector[] = [];
  for (let round = 0; round < 6; round++) {
    const secs = squarify(secList, 0, 0, W, H);
    layout = secs.map(sc => {
      const w = sc.w - SG, h = sc.h - SG, band = h >= 40 && w >= 40 ? 22 : 0;
      let items = sc.t.map(([s, v, d]) => ({ s, v, d })), cells: TreemapCell<{ s: string; v: number; d: number }>[] = [];
      for (let k = 0; k < 10 && items.length; k++) {
        cells = squarify(items, 0, band, w, h - band);
        const small = new Set(cells.filter(c => !fits(c)).map(c => c.s));
        if (!small.size) break;
        items = items.filter(i => !small.has(i.s));
        cells = [];
      }
      return { name: sc.n, x: sc.x + SG / 2, y: sc.y + SG / 2, w, h, band, avg: wavg(sc.t), cells };
    });
    const empty = new Set(layout.filter(l => !l.cells.length).map(l => l.name));
    if (!empty.size) break;
    secList = secList.filter(sc => !empty.has(sc.n));
  }
  return layout;
}

/** 지도 HTML. 컨테이너(.treemap)의 innerHTML 로 넣는다 */
export function renderTreemap(o: TreemapRenderOptions) {
  const { width: W, height: H } = o; if (!W || !H) return "";
  const max = mapMax(o.period ?? ""), markColor = o.markColor ?? (() => "#8894A6"), href = o.href ?? (s => `stock.html?s=${s}`);
  let html = "";
  layoutTreemap(o.sectors, W, H).forEach(({ name, x, y, w, h, band, avg, cells }) => {
    html += `<div class="sector" data-sector="${esc(name)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">`;
    if (band) html += `<div class="sector-band" style="height:${band}px"><span>${esc(name)}</span><span class="${tone(avg)}">${pct(avg)}</span></div>`;
    cells.forEach(c => {
      const size = c.w > 150 && c.h > 110 ? "xl" : c.w > 90 && c.h > 64 ? "lg" : "";
      /* 넓은 칸: 로고+티커+등락률, 중간 칸: 로고+등락률, 좁은 칸: 로고만. 티커는 마우스를 올리면 나오는 정보에 있다 */
      const fit = c.w >= 64 && c.h >= 76 ? "full" : c.h >= 56 ? "mid" : "min";
      const url = o.logoUrl(c.s), bg = url && o.logoBg ? o.logoBg(c.s) : null;
      const logo = url ? `<i class="tlogo img"${bg ? ` style="background:${bg}"` : ""}><img src="${esc(url)}" alt="" loading="lazy"></i>` : `<i class="tlogo" style="background:${markColor(c.s)}">${esc(c.s[0])}</i>`;
      html += `<a class="cell ${size} fit-${fit}" href="${esc(href(c.s))}" aria-label="${esc(c.s)} ${pct(c.d)}" data-sym="${esc(c.s)}" data-d="${c.d}" data-v="${c.v}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;background:${heat(c.d, max, o.dark)}">${logo}${fit === "full" ? `<b>${esc(c.s)}</b>` : ""}${fit !== "min" ? `<span>${pct(c.d)}</span>` : ""}</a>`;
    });
    html += `</div>`;
  });
  return html;
}

/** 지도에서 한 섹터만 밝게. name이 없으면 전체를 원래대로 */
export function focusTreemap(el: HTMLElement, name: string | null | undefined) {
  el.dataset.focus = name || "";
  el.querySelectorAll<HTMLElement>(".sector").forEach(s => s.classList.toggle("on", s.dataset.sector === name));
}

/** 칸에 마우스를 올렸을 때 보여 줄 정보 */
export function hoverInfoHTML(symbol: string, d: number, nameKo: string, priceText: string | null, capText: string) {
  return `<b>${esc(symbol)}</b> ${esc(nameKo)}<br><span class="${tone(d)}">${pct(d)}</span>${priceText ? `, ${esc(priceText)}` : ""}<br><span class="muted">시가총액 ${esc(capText)}</span>`;
}
