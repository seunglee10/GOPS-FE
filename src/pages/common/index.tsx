/* 홈·시장·종목 화면이 같이 쓰는 작은 조각. 목업 gops.js 의 ptitle(648), shares(675), 섹터 묶기 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../app/icons";
import type { HeatmapItem, NewsItem } from "../../api/types";
import type { TreemapSector } from "../../charts";
import { HAS_LOGO, logoBg, logoUrl, markColor } from "../../data/logos";

/** 블록 제목: 이동할 화면이 있으면 제목 자체가 링크(옆에 ›), 없으면 일반 제목 */
export function PTitle({ t, to }: { t: string; to?: string }) {
  return to ? <Link className="ptitle" to={to}>{t}<Ic name="chevR" /></Link> : <span className="t-label">{t}</span>;
}

/** 거래량(주): 1억 주가 넘으면 억, 아니면 만 */
export const sharesKo = (n: number): string => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억 주` : `${Math.round(n / 1e4).toLocaleString("ko-KR")}만 주`;

/** 지도 항목을 섹터별로 묶는다. 순서는 처음 나온 순서. 기간이 있으면 그 기간 등락을 쓴다 */
export function sectorsOf(items: HeatmapItem[], period: "" | "1w" | "1m" = ""): TreemapSector[] {
  const out = new Map<string, [string, number, number][]>();
  for (const it of items) {
    const d = period === "1w" ? it.changePercent1w ?? it.changePercent : period === "1m" ? it.changePercent1m ?? it.changePercent : it.changePercent;
    if (!out.has(it.sectorLabelKo)) out.set(it.sectorLabelKo, []);
    out.get(it.sectorLabelKo)!.push([it.symbol, it.marketCap / 1e9, d]);
  }
  return [...out.entries()];
}
/** 시가총액 가중 평균 등락 */
export const wavg = (t: [string, number, number][]): number => t.reduce((a, x) => a + x[1] * x[2], 0) / (t.reduce((a, x) => a + x[1], 0) || 1);

/* 지도 칸의 로고: 데이터 모듈의 로고 표를 지도 모듈 모양으로 */
export const mapLogoUrl = (s: string): string | null => logoUrl(s);
/** 로고 바탕·회사 색은 종목 마스터의 색을 먼저 쓴다. 색 표가 바뀔 때만 새 함수를 만든다 */
export function useMapColors(colors: Record<string, { color?: string | null }>) {
  return useMemo(() => ({
    logoBg: (s: string): string | null => (HAS_LOGO.has(s) ? logoBg(s, colors[s]?.color) ?? null : null),
    markColor: (s: string): string => markColor(s, colors[s]?.color),
  }), [colors]);
}

/** 뉴스 기사 화면 주소 */
export const newsHref = (n: Pick<NewsItem, "id">): string => `/news?n=${encodeURIComponent(n.id)}`;
