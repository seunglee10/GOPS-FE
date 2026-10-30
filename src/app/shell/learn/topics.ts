/* 화면에서 용어가 나온 곳 찾기·표시. 목업 gops.js TOPIC_KW(1655)·topicEls(1658)·hlTopic(1675)·chartTopics(1671).
   본문(#page)의 글자를 훑어 용어가 들어 있는 칸에 topic-hl 테두리를 붙인다. 화면의 용어에 밑줄이나 누를 곳은 두지 않는다 */
import { useEffect, useState } from "react";

export const TOPIC_KW: Record<string, string[]> = { candle: ["캔들", "양봉", "음봉"], trend: ["추세", "돌파"], sup: ["지지", "저항"], vol: ["거래량"], rsi: ["RSI"], per: ["PER"], range: ["52주"], opm: ["영업이익률"] };
/* 글자로 찾기 어려운 곳은 자리로 찾는다 (오늘 등락은 숫자뿐이라) */
const TOPIC_SEL: Record<string, string> = { chg: "#lv-chg" };
const SKIP = "svg, .termcard, .vercmp, .course, .aq-q, .aq-brief, .ai-sum";
const BOX = ".statgrid > div, th, .layer, .tag, li, .mvrow, .brief p, article, .proposal";

export function topicEls(t: string): Element[] {
  const root = document.getElementById("page"), kw = TOPIC_KW[t]; if (!root) return [];
  if (TOPIC_SEL[t]) return [...root.querySelectorAll(TOPIC_SEL[t])];
  if (!kw) return [];
  const out = new Set<Element>();
  root.querySelectorAll("*").forEach(el => {
    if (el.closest(SKIP)) return;
    if (![...el.childNodes].some(nd => nd.nodeType === 3 && kw.some(k => (nd.textContent || "").includes(k)))) return;
    out.add(el.closest(BOX) || el);
  });
  root.querySelectorAll(`.tz[data-topic="${t}"]`).forEach(e => out.add(e));
  return [...out];
}

/* t는 주제 하나 또는 띄어 쓴 여러 개 ("chg vol") */
export function hlTopic(t: string | null) {
  document.querySelectorAll(".topic-hl").forEach(e => e.classList.remove("topic-hl"));
  if (t) t.split(" ").forEach(k => topicEls(k).forEach(e => e.classList.add("topic-hl")));
}

/* 화면에 나온 곳 수. 본문 글자가 바뀌면 다시 센다 (차트 안 용어는 다음 프레임에 그려지니 종목 차트 탭이면 있다고 친다) */
export function useTopicCounts(keys: string[], chartTopics: string[]): Record<string, number> {
  const [cnt, setCnt] = useState<Record<string, number>>({});
  const sig = keys.join(",") + "|" + chartTopics.join(",");
  useEffect(() => {
    const count = () => {
      const next = Object.fromEntries(keys.map(t => [t, topicEls(t).filter(e => !e.classList.contains("tz")).length + (chartTopics.includes(t) ? 1 : 0)]));
      setCnt(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    count();
    const root = document.getElementById("page"); if (!root) return;
    let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(count); });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return cnt;
}

/* 표시할 용어(hover 가 우선, 없으면 열어 둔 카드)를 화면에 칠한다. 사이드바를 닫으면 지운다 */
export function useTopicHighlight(key: string | null, scrollTo: boolean) {
  useEffect(() => {
    hlTopic(key);
    if (scrollTo && key) document.querySelector(".topic-hl:not(.tz)")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const root = document.getElementById("page");
    let raf = 0;
    const mo = root ? new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => hlTopic(key)); }) : null;
    mo?.observe(root!, { childList: true, subtree: true, characterData: true });
    return () => { mo?.disconnect(); cancelAnimationFrame(raf); hlTopic(null); };
  }, [key, scrollTo]);
}
