/* 목업 gops.js 134~181줄의 ic 표를 React 로. 같은 svg 속성을 그대로 두어 gops.css 가 그대로 먹는다 */
import type { CSSProperties } from "react";

type Def = { s: number; fill: string; stroke?: string; sw?: number; cap?: boolean; join?: boolean; body: string };
const D = (s: number, fill: string, stroke: string | undefined, sw: number | undefined, body: string, cap = false, join = false): Def => ({ s, fill, stroke, sw, body, cap, join });
const BELL = '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>';
const GRID = '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
const HEART = '<path d="M12 20.5s-7.5-4.4-9.2-9.3C1.7 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.7 1.2-1.6 2.8-2.7 4.8-2.7 3.6 0 5.5 3.5 4.4 6.7-1.7 4.9-9.2 9.3-9.2 9.3z"/>';
const SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>';
const STAR = '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>';
const X = '<path d="M6 6l12 12M18 6 6 18"/>';

export const ICONS = {
  logo: D(18, "none", "currentColor", 2.4, '<path d="M4 18 10 11l4 3 6-8"/>'),
  bell: D(18, "none", "currentColor", 1.8, BELL),
  search16: D(17, "none", "currentColor", 2.2, SEARCH),
  bell16: D(16, "none", "currentColor", 2, BELL),
  grid16: D(16, "none", "currentColor", 2, GRID),
  heart: D(22, "currentColor", undefined, undefined, HEART),
  heartFill: D(18, "currentColor", undefined, undefined, HEART),
  wallet: D(22, "currentColor", undefined, undefined, '<path d="M4 18V9.5l4.5-4 4 3 3-3.5L20 8v10z"/>'),
  clock: D(22, "currentColor", undefined, undefined, '<path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm.9 4.5v4.6l3.4 2-.9 1.5-4.3-2.5V7z"/>'),
  foldR: D(20, "none", "currentColor", 2, '<path d="m6 6 6 6-6 6M13 6l6 6-6 6"/>'),
  foldL: D(20, "none", "currentColor", 2, '<path d="m18 6-6 6 6 6M11 6l-6 6 6 6"/>'),
  chevR: D(16, "none", "currentColor", 2, '<path d="m9 6 6 6-6 6"/>'),
  chevL: D(16, "none", "currentColor", 2, '<path d="m15 6-6 6 6 6"/>'),
  eye: D(18, "none", "currentColor", 1.9, '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  wallet16: D(16, "none", "currentColor", 2, '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2"/>'),
  grid: D(18, "none", "currentColor", 1.8, GRID),
  send: D(18, "none", "currentColor", 2.2, '<path d="M12 19V5M5 12l7-7 7 7"/>'),
  stop: D(14, "currentColor", undefined, undefined, '<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  chat: D(18, "none", "currentColor", 1.8, '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  x: D(14, "none", "currentColor", 2.2, X),
  x18: D(18, "none", "currentColor", 2, X),
  check: D(12, "none", "currentColor", 3.2, '<path d="M5 12.5 10 17 19 7"/>'),
  warn: D(12, "none", "currentColor", 3.4, '<path d="M12 6v7M12 18h.01"/>', true),
  alert: D(20, "none", "currentColor", 2, '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01" stroke-linecap="round"/>'),
  search: D(20, "none", "currentColor", 2, SEARCH),
  star: D(16, "none", "currentColor", 1.8, STAR),
  starOn: D(16, "#f5b800", "#f5b800", 1.8, STAR),
  plus: D(16, "none", "currentColor", 2, '<path d="M12 5v14M5 12h14"/>'),
  expand: D(16, "none", "currentColor", 2, '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', true, true),
  book: D(16, "none", "currentColor", 1.9, '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>', false, true),
  chart: D(16, "none", "currentColor", 1.9, '<path d="M4 19h16"/><path d="M7 15V9M11 15V5M15 15v-4M19 15V8"/>'),
  arrowR: D(16, "none", "currentColor", 2, '<path d="M5 12h14M13 6l6 6-6 6"/>'),
  list: D(16, "none", "currentColor", 2, '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  more: D(16, "currentColor", undefined, undefined, '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'),
  sort: D(10, "currentColor", undefined, undefined, '<path d="M12 18 5 9h14z"/>'),
  spark: D(16, "none", "currentColor", 2, '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>'),
  cart: D(16, "none", "currentColor", 2, '<path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>'),
  refresh: D(16, "none", "currentColor", 2, '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>', true, true),
  undo: D(16, "none", "currentColor", 2, '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  trend: D(24, "none", "currentColor", 2.2, '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>', true, true),
  inbox: D(20, "none", "currentColor", 1.8, '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
} as const;
export type IconName = keyof typeof ICONS;

export function Ic({ name, style, className }: { name: IconName; style?: CSSProperties; className?: string }) {
  const d = ICONS[name];
  return (
    <svg width={d.s} height={d.s} viewBox="0 0 24 24" fill={d.fill} stroke={d.stroke} strokeWidth={d.sw}
      strokeLinecap={d.cap ? "round" : undefined} strokeLinejoin={d.join ? "round" : undefined} style={style} className={className}
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: d.body }} />
  );
}
