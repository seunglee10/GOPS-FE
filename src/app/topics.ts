/* 화면 속 용어 찾기. 목업 gops.js TOPIC_KW·topicEls·topicCount·hlTopic(1653~1678)과 마우스 표시(3524~3528).
   사이드바 '용어 풀이' 목록과 종목 화면 AI 분석 칸(.aq-q[data-hl])에 마우스를 올리면 화면에서 그 용어가 나온 곳에 테두리를 그린다 */
import { useEffect } from "react";

const TOPIC_KW: Record<string, string[]> = { candle: ["캔들", "양봉", "음봉"], trend: ["추세", "돌파"], sup: ["지지", "저항"], vol: ["거래량"], rsi: ["RSI"], per: ["PER"], range: ["52주"], opm: ["영업이익률"] };
/* 글자로 찾기 어려운 곳은 자리로 찾는다 (오늘 등락은 숫자뿐이라) */
const TOPIC_SEL: Record<string, string> = { chg: "#lv-chg" };

export function topicEls(t: string): Element[] {
  const root = document.getElementById("page"), kw = TOPIC_KW[t]; if (!root) return [];
  if (TOPIC_SEL[t]) return [...root.querySelectorAll(TOPIC_SEL[t])];
  if (!kw) return [];
  const out = new Set<Element>();
  root.querySelectorAll("*").forEach(el => {
    if (el.closest("svg, .termcard, .vercmp, .course, .aq-q, .aq-brief, .ai-sum")) return;
    if (![...el.childNodes].some(nd => nd.nodeType === 3 && kw.some(k => (nd.textContent ?? "").includes(k)))) return;
    out.add(el.closest(".statgrid > div, th, .layer, .tag, li, .mvrow, .brief p, article, .proposal") || el);
  });
  root.querySelectorAll(`.tz[data-topic="${t}"]`).forEach(e => out.add(e));
  return [...out];
}
/** 종목 차트 탭이면 차트 안 용어(캔들·거래량·지지선)는 있다고 친다 */
export const chartTopics = (): string[] => {
  const p = new URLSearchParams(window.location.search);
  return document.body.dataset.page === "stock" && (p.get("tab") || "chart") === "chart" ? ["candle", "vol", "sup"] : [];
};
export const topicCount = (t: string): number => topicEls(t).filter(e => !e.classList.contains("tz")).length + (chartTopics().includes(t) ? 1 : 0);
/** t는 주제 하나 또는 띄어 쓴 여러 개 ("chg vol") */
export function hlTopic(t: string | null) {
  document.querySelectorAll(".topic-hl").forEach(e => e.classList.remove("topic-hl"));
  if (t) t.split(" ").forEach(k => topicEls(k).forEach(e => e.classList.add("topic-hl")));
}
/** 목록 줄·AI 분석 칸에 마우스를 올리면 표시하고, 벗어나면 지금 열어 둔 용어(없으면 없음)로 돌린다 */
export function useTopicHover(current: string | null) {
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const r = (e.target as Element).closest?.<HTMLElement>(".lp-row[data-topic], .aq-q[data-hl]"), key = r && (r.dataset.topic || r.dataset.hl), was = document.body.dataset.hlRow;
      if (r && key && was !== key) { document.body.dataset.hlRow = key; hlTopic(key); }
      else if (!r && was) { delete document.body.dataset.hlRow; hlTopic(current); }
    };
    document.addEventListener("mouseover", on);
    return () => document.removeEventListener("mouseover", on);
  }, [current]);
}
