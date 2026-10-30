/* AI 요약·대화 목 데이터. 목업 gops.js 295~336(입력 제안), 366(예시 질문), 429~481(고정 답변), 1084~1111(종목 AI 요약) */
import type { AgentContext, AgentView, AiSummary, AgentMessage } from "../../api/types";
import { S, WHY, sectorOf } from "./symbols";
import { SUP, RES } from "./candles";
import { NEWS, newsId } from "./news";
import { upcomingOf, ddayOf, md } from "./facts";

export const EXAMPLES: Record<string, string[]> = {
  home: ["오늘 미국 시장 어땠어?", "내 보유 종목 중 약한 건 뭐야?", "오늘 가장 많이 오른 업종은?"],
  market: ["오늘 반도체가 왜 올랐어?", "내 보유 종목 중 약한 건 뭐야?", "금리가 오르면 어떤 섹터가 불리해?"],
  stock: ["오늘 거래량이 왜 늘었어?", "지지선 137.70은 얼마나 믿을 만해?", "150달러 넘으면 알려줘"],
  portfolio: ["TSLA 손실을 줄이려면?", "내 포트폴리오 비중 괜찮아?", "체결 대기 주문 정리해줘"],
  coach: ["추격 매수를 줄이려면?", "이번 달 제일 잘한 거래는?", "가드레일 추천해줘"],
};

/* 에이전트 입력 제안: 입력이 어디로 가는지 먼저 보여 준다 */
export type Suggestion =
  | { kind: "go"; label: string; meta: string; href: string }
  | { kind: "rule"; label: string; meta: string }
  | { kind: "order"; label: string; meta: string }
  | { kind: "star"; label: string; meta: string }
  | { kind: "ask"; label: string; sub: string; meta: string };
export function suggestions(t: string, page: string, ctx: string): Suggestion[] {
  const txt = t.trim(); if (!txt) return [];
  const out: Suggestion[] = [];
  const up = txt.toUpperCase();
  Object.entries(S).forEach(([k, v]) => {
    if ((up.length >= 2 && k.startsWith(up)) || (txt.length >= 2 && v.ko.includes(txt))) out.push({ kind: "go", label: `${v.ko} 차트 열기`, meta: k, href: `/stock?s=${k}` });
  });
  if (/알림|규칙|알려/.test(txt)) {
    out.push({ kind: "rule", label: "새 알림 규칙 만들기", meta: ctx });
    out.push({ kind: "go", label: "내 규칙 보기", meta: "5개", href: "/portfolio?tab=rules" });
  }
  if (/매수|주문|사/.test(txt)) out.push({ kind: "order", label: `${ctx} 매수 주문 창 열기`, meta: "모의투자" });
  if (/비교/.test(txt)) out.push({ kind: "go", label: `${ctx} 비교 탭 열기`, meta: "AMD, AVGO", href: `/stock?s=${ctx}&tab=compare` });
  if (/관심/.test(txt)) out.push({ kind: "star", label: `${ctx} 관심 종목에 추가`, meta: "" });
  out.push({ kind: "ask", label: "AI에게 질문하기", sub: `“${txt}”`, meta: page === "stock" ? `${ctx} 차트와 함께` : "지금 화면과 함께" });
  return out.slice(0, 6);
}

/* 답변이 오는 동안 보여 주는 진행 단계 */
export const PROGRESS_STEPS = ["질문 이해: 9/30 거래량 급증 원인", "뉴스 12건 확인", "차트와 거래량 해석 중", "실적 추정치 비교"];
export const PROGRESS_NOW = 2;   // 세 번째 줄이 진행 중
/* 목업의 고정 대화 (NVDA 9/30 거래량 질문). 답변은 레이아웃과 상관없이 항상 여기 남는다 */
export const FIXED_THREAD: AgentMessage[] = [
  { role: "user", text: "오늘 거래량이 왜 이렇게 늘었어?", at: "오늘 09:44", ctx: ["NVDA", "9/30 캔들"] },
  { role: "assistant", view: {
    conclusion: "9월 30일 거래량이 20일 평균의 **2.1배**로 늘었어요. 차세대 GPU 출하가 앞당겨진다는 보고서에 매수가 몰렸어요.",
    sections: [
      { title: "왜 늘었나", body: "장 시작 전 나온 공급망 보고서가 출하 시점을 한 분기 앞당겨 전했어요. 같은 날 반도체 대형주 거래도 함께 늘었어요.", evidence: [{ kind: "news", ref: "news", label: "뉴스 3건" }] },
      { title: "가격 위치", body: null, evidence: [{ kind: "chart", ref: "chart", label: "9/30 캔들" }], kv: [{ k: "지지선", v: `$${SUP.toFixed(2)}`, sub: "여기서 반등" }, { k: "52주 고점까지", v: "1.5%" }, { k: "다음 저항선", v: `$${RES.toFixed(2)}` }] },
      { title: "주의할 점", body: "추정치가 더 오르지 않으면 지금 가격이 부담이 될 수 있어요.", evidence: [{ kind: "fin", ref: "fin", label: "재무" }], kv: [{ k: "12개월 선행 PER", v: "34배" }, { k: "섹터 평균", v: "28배" }] },
    ],
    steps: ["뉴스 12건 중 관련 3건 선별", "9/30 캔들, 거래량, 지지선 확인", "실적 추정치 변경 이력 비교", "같은 섹터 PER 비교"],
    confidence: "높음", evidenceCount: 3,
    suggestions: [
      { kind: "rule", label: `$${RES.toFixed(2)} 돌파하면 알림`, payload: { symbol: "NVDA", price: RES, dir: "above" } },
      { kind: "compare", label: "AMD, AVGO와 나란히 보기", symbols: ["NVDA", "AMD", "AVGO"] },
    ],
  } },
];
export const SUGGESTION_DESC: Record<string, string> = {
  rule: "저항선을 넘으면 추세가 이어지는지 확인할 수 있어요.",
  compare: "같은 날 반도체 3종목의 거래량과 등락을 비교해요.",
};
export const FIXED_THREAD_TITLE = "NVDA 대화";
export const STOP_TOAST = "분석을 멈췄어요. 지금까지 확인한 내용은 대화에 남겨 뒀어요.";
export const ANSWER_DELAY_MS = 2200;
export function fixedAnswer(_question: string, _ctx: AgentContext): AgentView {
  return (FIXED_THREAD[1] as Extract<AgentMessage, { role: "assistant" }>).view;
}

/* ---------- AI 요약: 뉴스·공시·일정을 읽고 "왜 움직였나, 이 회사에 지금 무슨 일이 있나"를 한 번에 정리 ----------
   목업은 NVDA만 손으로 쓰고 나머지는 데이터로 채운다 */
export const AI_SUM: Record<string, { head: string; news: [string, number][]; risk: [string, number][]; note: Record<string, string> }> = {
  NVDA: { head: "차세대 GPU 출하가 한 분기 앞당겨진다는 공급망 보고서가 나온 날이에요. 업종보다 두 배 넘게 올랐고 거래도 평소의 두 배가 몰렸어요.",
    news: [["대만 부품업체 조사에서 차세대 GPU 출하 시점이 당초보다 한 분기 이르게 잡혔어요. TSMC 첨단 패키징 증설이 이유로 꼽혔고, 회사는 입장을 내지 않았어요.", 0],
      ["MS·아마존·구글의 내년 AI 설비투자 계획을 합치면 올해보다 20% 넘게 늘어요. 늘어난 돈 대부분이 데이터센터와 AI 칩 구매로 가요.", 1],
      ["TSMC 9월 매출이 1년 전보다 39% 늘었어요. 회사는 AI 서버용 칩 주문을 이유로 들었고, 3분기 매출도 제시 범위 위쪽이었어요.", 3]],
    risk: [["미 상무부가 대중 첨단 반도체 수출 규제 세부안을 연말까지 내놔요. 어떤 칩이 대상인지는 아직 공개되지 않았어요.", 2]],
    note: { "실적 발표": "시장 예상 매출 335억 달러" } }
};
const pct = (v: number) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";
export function aiSummary(s: string, price?: number): AiSummary {
  const st = S[s], p = price ?? st.p, chg = (p / (st.p / (1 + st.d / 100)) - 1) * 100;
  const [secName, secList] = sectorOf(s), secAvg = secList.length ? secList.reduce((a, t) => a + t[2], 0) / secList.length : 0;
  const mine = NEWS.map((n, i) => [n, i] as const).filter(([n]) => n[4].includes(s));
  const A = AI_SUM[s] || {
    // 머리 문장: 그날 움직인 이유 → 없으면 가장 최근 기사 제목 → 그것도 없으면 업종 흐름만
    head: `${WHY[s] ? `${WHY[s][0]}.` : mine.length ? `${mine[0][0][0]}.` : "이 종목만 다룬 새 기사는 없어요."} ${secName} 업종(${pct(secAvg)})과 ${Math.sign(chg) === Math.sign(secAvg) ? "같은 방향이에요" : "반대로 움직였어요"}.`,
    news: mine.map(([n, i]) => [n[5] ? n[5].join(" ") : n[0], i] as [string, number]), risk: [] as [string, number][], note: {} as Record<string, string> };
  const up = upcomingOf(s);
  return {
    symbol: s, generatedAt: "2026-09-30T20:00:00Z",
    head: A.head,
    news: A.news.map(([text, i]) => ({ text, newsId: newsId(i) })),
    risks: A.risk.map(([text, i]) => ({ text, newsId: newsId(i) })),
    events: up.map(u => ({ title: u.title, at: md(u.at), note: A.note[u.title] ?? null, dday: ddayOf(u.at) })),
    chartNote: null,
    meta: `뉴스 ${mine.length}건 · 일정 ${up.length}건 · 9/30 마감 기준`,
  };
}
