/* 코스 '차트 읽기 첫걸음'. 목업 gops.js 1400~1491줄. 문제의 함수형 정답(ans())은 여기서 미리 평가해 answerSet 으로 둔다 (계약 D29) */
import type { CourseChartRow, CourseFig, CourseQuestion } from "../../api/types";
import { COURSE_CHARTS } from "./courseCharts";

export const COURSE_ID = "chart-basics";
export const COURSE_TITLE = "차트 읽기 첫걸음";
const CC = COURSE_CHARTS;
export const crow = (k: string, d: string): number => CC[k].rows.findIndex(r => r[0] === d);
export const pivotLows = (rows: CourseChartRow[], k = 4): number[] => rows.map((_, i) => i).filter(i => i >= k && i < rows.length - k && rows[i][3] <= Math.min(...rows.slice(i - k, i + k + 1).map(r => r[3])));
export const krDate = (d: string): string => { const [y, m, dd] = d.split("-"); return `${y}년 ${+m}월 ${+dd}일`; };
export const won = (v: number): string => (v / 1e8).toFixed(1) + "억 주";
export const DAYS: Record<number, string> = { 1: "캔들", 2: "고점·저점과 추세", 3: "지지선·저항선", 4: "거래량", 5: "RSI", 6: "PER" };
export const TOPIC_NAME: Record<string, string> = { candle: "캔들", trend: "추세", sup: "지지선·저항선", vol: "거래량", rsi: "RSI", per: "PER" };
/* 사전에 싣는 용어: 실전 차트가 있는 주제 + 카드만 있는 용어 */
export const TERM_NAME: Record<string, string> = { ...TOPIC_NAME, range: "52주 범위", opm: "영업이익률" };

/* 시가 대비가 아니라 전날 종가 대비 오르내린 폭으로 계산하는 14일 단순 RSI */
export function rsiRows(R: CourseChartRow[], end = R.length - 1): { up: number; down: number; v: number } {
  let up = 0, down = 0;
  for (let i = end - 13; i <= end; i++) { const d = R[i][4] - R[i - 1][4]; if (d > 0) up += d; else down -= d; }
  return { up, down, v: 100 * up / (up + down || 1) };
}

/* 힌트: 1단계는 판단 기준 한 줄, 2단계는 볼 곳을 차트에 표시. 정답은 알려 주지 않는다. 본 기록은 남기지 않는다 */
export const HINTS: Record<string, string[]> = {
  c2: ["꼬리는 그날 장중에 갔다가 되돌아온 가격이에요. 위 꼬리의 끝은 그날 가장 높이 올라간 가격이에요.", "표시한 날 위 꼬리 끝에서 오른쪽 가격 눈금까지 선을 그어 뒀어요."],
  c4: ["캔들 색은 전날 종가가 아니라 그날 시가(시작)와 종가(끝)를 비교해서 정해요. 끝이 시작보다 높으면 양봉이에요.", "이날 캔들을 왼쪽 위에 크게 확대해 뒀어요. 시가에서 종가로 가는 화살표가 위로 가는지 아래로 가는지 보세요."],
  t1: ["저점은 앞뒤 며칠보다 낮은 날이에요. 차트 맨 앞처럼 한쪽에만 날짜가 있는 곳은 저점으로 치지 않아요.", "저점이 하나씩 들어 있는 구간 3개를 표시해 뒀어요. 구간마다 가장 낮은 날을 찾아보세요."],
  t2: ["처음과 끝 가격만 보지 말고, 크게 올라갔던 꼭대기(고점)끼리 비교해 보세요.", "큰 고점들을 점선으로 이어 뒀어요. 점선이 어느 쪽으로 기울었는지 보세요."],
  s1: ["몸통이 아니라 아래 꼬리 끝을 보세요. 비슷한 높이에서 여러 번 멈춘 곳이 있어요.", "캔들마다 아래 꼬리 끝에 점을 찍어 뒀어요. 점이 여러 개 모인 높이를 찾아보세요."],
  v3: ["점선 높이(평균)를 막대 하나라고 생각하고, 파란 막대에 몇 개가 들어가는지 세어 보세요.", "파란 막대 위에 평균 높이만 한 칸을 쌓아 뒀어요."],
  r2: ["위 가격 차트가 아니라 아래 RSI 선에서 먼저 찾고, 그 날짜를 위로 따라 올라가 누르세요.", "30 선을 진하게 하고, RSI 선이 처음 그 아래로 내려가는 무렵을 표시해 뒀어요."],
};
/* 패널에서 볼 때 보여 줄 구간 [시작일, 끝일]. 답과 판단에 필요한 날은 모두 들어가게 잡았다 */
export const PZ: Record<string, [number | string, number | string]> = { t1: [16, 59], s1: ["2023-02-01", "2023-03-20"], s2: ["2019-09-20", "2019-11-12"], v1: ["2023-04-24", "2023-06-16"], v2: ["2023-04-24", "2023-06-16"], r2: ["2020-01-27", "2020-03-31"] };

type Q = Omit<CourseQuestion, "hints" | "explanation" | "opts" | "answer" | "answerSet" | "band" | "tolerance" | "count" | "bridge"> & {
  opts?: string[]; ans?: number | (() => number[]); band?: () => [number, number]; tol?: number; count?: number; bridge?: string; fig: CourseFig; exp: () => string;
};
const nvdaVol = () => { const R = CC.nvda.rows, i = crow("nvda", "2023-05-25"), av = R.slice(i - 20, i).reduce((a, r) => a + r[5], 0) / 20; return { R, i, av }; };
const RAW: Q[] = [
  { id: "c1", day: 1, topic: "candle", title: "빨간 캔들이 뜻하는 것", kind: "choice", fig: { type: "diagram" },
    prompt: "국내 증권 앱에서 빨간 캔들(양봉)은 무엇을 뜻할까요?",
    opts: ["그날 시작한 가격보다 높게 끝났다", "전날보다 가격이 올랐다", "그날 거래량이 평소보다 많았다", "앞으로 가격이 오를 가능성이 크다"], ans: 0,
    exp: () => "양봉은 그날 시가(시작 가격)보다 종가(끝 가격)가 높았다는 뜻이에요. 전날과 비교한 게 아니에요. 그리고 지나간 하루의 기록일 뿐, 앞으로의 방향을 알려 주지는 않아요." },
  { id: "c2", day: 1, topic: "candle", title: "꼬리 끝은 무슨 가격일까", kind: "choice", fig: { chart: "msft_wick", mark: "2018-10-11" },
    prompt: "마이크로소프트 차트에서 표시한 날(2018년 10월 11일), 장중에 가장 높았던 가격은 얼마일까요?",
    opts: ["$108.93", "$105.91", "$105.35", "$104.20"], ans: 0,
    exp: () => "위 꼬리의 끝이 그날의 고가예요. 이날은 $105.35에 시작해 장중 $108.93까지 올랐다가 $105.91에 끝났어요. 위로 긴 꼬리는 장중에 그 가격까지 올라갔다가 되돌아왔다는 기록이에요." },
  { id: "c3", day: 1, topic: "candle", title: "음봉 모두 찾기", kind: "tap", fig: { chart: "wmt" }, ans: () => CC.wmt.rows.map((r, i) => r[4] < r[1] ? i : -1).filter(i => i >= 0),
    prompt: "월마트의 12거래일 차트예요. 음봉(시작보다 낮게 끝난 날)을 모두 누르세요.",
    exp: () => "파란 캔들 4개가 음봉이에요. 몸통이 아주 짧아도 종가가 시가보다 낮으면 음봉이에요." },
  { id: "c4", day: 1, topic: "candle", title: "24% 오른 날의 캔들 색", kind: "choice", fig: { chart: "nvda_wk", mark: "2023-05-25", prev: true, mono: true },
    prompt: "엔비디아는 2023년 5월 25일에 전날보다 24.4% 올랐어요. 캔들 색은 정답을 확인하면 보여 드릴게요. 차트에 적힌 시가와 종가를 보고, 이날 캔들이 양봉일지 음봉일지 골라 보세요.",
    opts: ["양봉", "음봉"], ans: 1,
    exp: () => "음봉이에요. 전날 장 마감 뒤 실적 발표가 나오면서 이날은 전날 종가 $30.54보다 훨씬 높은 $38.52에 시작했어요. 그리고 $37.98에 끝나 시작보다 조금 낮게 마감했어요. 캔들 색은 전날이 아니라 그날 시가와 비교해서 정해져요." },
  { id: "t1", day: 2, topic: "trend", title: "저점 3개 찾기", kind: "tap", tol: 1, fig: { chart: "aapl" }, ans: () => pivotLows(CC.aapl.rows), bridge: "저점",
    prompt: "애플의 2019년 2~4월 차트예요. 가격이 내려갔다가 다시 올라간 자리(저점) 3개를 누르세요. 표시한 날의 하루 앞뒤까지는 정답으로 쳐요.",
    exp: () => "3월 8일 $42.38, 3월 26일 $46.15, 4월 12일 $49.05가 저점이에요. 저점이 갈수록 높아졌죠. 저점이 계속 높아지는 모양을 상승 추세라고 불러요." },
  { id: "t2", day: 2, topic: "trend", title: "1년 넘게 이어진 모양", kind: "choice", fig: { chart: "meta" },
    prompt: "메타의 2021년 8월부터 2022년 12월까지 주봉 차트예요(캔들 하나가 1주). 이 기간의 모양은 무엇일까요?",
    opts: ["상승 추세", "하락 추세", "횡보"], ans: 1,
    exp: () => "하락 추세예요. 2021년 8월 30일 주의 고가 $384.33에서 2022년 10월 31일 주의 저가 $88.09까지, 고점과 저점이 대체로 계속 낮아졌어요. 중간에 몇 주씩 오른 구간도 있지만, 그때의 고점이 앞선 고점을 넘지 못했어요." },
  { id: "t3", day: 2, topic: "trend", title: "방향이 없는 구간", kind: "choice", fig: { chart: "pg" },
    prompt: "P&G의 2024년 2~4월 차트예요. 이 기간의 모양은 무엇일까요?",
    opts: ["상승 추세", "하락 추세", "횡보"], ans: 2,
    exp: () => "횡보예요. 60거래일 동안 가장 높았던 가격($164.32)과 가장 낮았던 가격($153.52)의 차이가 7% 정도이고, 시작($159.18)과 끝($161.29)도 거의 같아요. 고점과 저점이 한쪽으로 기울지 않으면 횡보라고 불러요." },
  { id: "s1", day: 3, topic: "sup", title: "여러 번 멈춘 가격대", kind: "level", fig: { chart: "ko" }, bridge: "지지선",
    band: () => { const m = Math.min(...CC.ko.rows.map(r => r[3])); return [m * 0.994, m * 1.02]; },
    prompt: "코카콜라의 2023년 1~3월 차트예요. 가격이 여러 번 내려왔다가 멈추고 다시 올라간 가격대를 누르세요.",
    exp: () => "$58.4 근처예요. 2월 10일, 2월 16일, 3월 1~2일, 3월 10일에 이 근처까지 내려왔다가 다시 올라갔어요. 이렇게 여러 번 멈춘 가격대를 이은 선을 지지선이라고 불러요. 그 가격 근처에서 사려는 사람이 많았다는 기록이에요." },
  { id: "s2", day: 3, topic: "sup", title: "저항선을 넘은 날", kind: "tap", count: 1, fig: { chart: "msft_brk", level: 142.37 }, ans: () => [crow("msft_brk", "2019-10-28")],
    prompt: "마이크로소프트의 2019년 8~11월 차트예요. 보라색 점선은 9~10월에 여러 번 막혔던 가격(저항선)이에요. 이 선 위에서 처음 마감한 날을 누르세요.",
    exp: () => "2019년 10월 28일이에요. 종가 $144.19로 저항선 $142.37 위에서 마감했어요. 저항선은 그 가격 근처에서 팔려는 사람이 많았다는 기록이라, 그 위에서 마감한 날을 '저항선 돌파'라고 불러요. 이 차트의 마지막 날(11월 12일)까지는 계속 그 위에서 마감했어요." },
  { id: "v1", day: 4, topic: "vol", title: "거래량이 가장 많았던 날", kind: "tap", count: 1, fig: { chart: "nvda", vol: true }, ans: () => [crow("nvda", "2023-05-25")],
    prompt: "엔비디아의 2023년 3~6월 차트예요. 아래 막대가 거래량이에요. 거래량이 가장 많았던 날을 누르세요.",
    exp: () => { const { R, i, av } = nvdaVol(); return `5월 25일이에요. 하루에 ${won(R[i][5])}가 거래됐어요. 직전 20거래일 평균의 ${(R[i][5] / av).toFixed(1)}배예요. 같은 날 가격도 전날보다 24.4% 올랐어요.`; } },
  { id: "v2", day: 4, topic: "vol", title: "그날 무슨 일이 있었을까", kind: "choice", fig: { chart: "nvda", vol: true, mark: "2023-05-25" },
    prompt: "거래량이 평소의 4배 가까이 몰리고 가격이 하루에 24% 오른 이날, 무슨 일이 있었을까요?",
    opts: ["전날 장 마감 뒤 실적 발표", "주식 분할", "CEO 교체", "특별한 일 없음"], ans: 0,
    exp: () => "전날(5월 24일) 장 마감 뒤에 실적을 발표했어요. 다음 분기 매출 전망을 약 110억 달러로 내놨는데, 시장 예상(70억 달러 안팎)보다 훨씬 컸어요. 거래량이 크게 몰린 날은 이렇게 실적이나 뉴스 같은 사건이 있는 경우가 많아요. 거래량이 튄 날을 보면 그날 뉴스를 같이 찾아보세요." },
  { id: "v3", day: 4, topic: "vol", title: "평소의 몇 배였을까", kind: "choice", fig: { type: "volbars", chart: "nvda", day: "2023-05-25" },
    prompt: "회색 막대는 엔비디아의 2023년 5월 25일 전 20거래일 거래량이고, 점선은 그 평균이에요. 5월 25일(파란 막대) 거래량은 평균의 몇 배쯤일까요?",
    opts: ["약 1배", "약 2배", "약 4배", "약 10배"], ans: 2,
    exp: () => { const { R, i, av } = nvdaVol(); return `약 ${(R[i][5] / av).toFixed(1)}배예요. 평균은 하루 ${won(av)}, 이날은 ${won(R[i][5])}였어요. '평균의 몇 배'로 보면 종목마다 거래량 규모가 달라도 평소보다 얼마나 몰렸는지 비교할 수 있어요.`; } },
  { id: "r1", day: 5, topic: "rsi", title: "막대로 RSI 어림하기", kind: "choice", fig: { type: "rsibars", chart: "spy14" },
    prompt: "S&P 500 ETF(SPY)의 2020년 1월 30일~2월 19일, 14거래일 동안 매일 오르내린 폭이에요. 빨간 막대가 오른 폭, 파란 막대가 내린 폭이에요. RSI는 대략 얼마일까요?",
    opts: ["약 30", "약 50", "약 70", "약 90"], ans: 2,
    exp: () => { const P = rsiRows(CC.spy14.rows); return `오른 폭 합계 $${P.up.toFixed(2)}, 내린 폭 합계 $${P.down.toFixed(2)}라서 오른 쪽 비율이 ${P.v.toFixed(1)}%예요. RSI는 바로 이 비율이에요. 마지막 날인 2월 19일은 S&P 500이 당시 사상 최고치로 마감한 날이에요.`; } },
  { id: "r2", day: 5, topic: "rsi", title: "RSI가 30 아래로 간 날", kind: "tap", count: 1, tol: 1, fig: { chart: "spy", rsi: true }, ans: () => [crow("spy", "2020-02-25")],
    prompt: "같은 ETF의 2019년 12월~2020년 4월 차트예요. 아래 선이 RSI예요. RSI가 처음으로 30 아래로 내려간 날을 누르세요. 하루 앞뒤까지는 정답으로 쳐요.",
    exp: () => "2020년 2월 25일이에요(RSI 29.98, 종가 $312.65). 업계에서는 이 상태를 '과매도'라고 부르지만, 가격은 그 뒤에도 계속 내려 3월 23일 $222.95까지 28.7% 더 떨어졌어요. RSI 30 아래는 최근에 거의 내리기만 했다는 기록이지, 곧 오른다는 신호가 아니에요." },
  { id: "p1", day: 6, topic: "per", title: "PER 직접 계산하기", kind: "choice", fig: { type: "per" },
    prompt: "어떤 회사의 주가가 $100이고, 1주당 1년 이익이 $5예요. PER은 몇 배일까요?",
    opts: ["5배", "20배", "50배", "500배"], ans: 1,
    exp: () => "$100 ÷ $5 = 20배예요. 이익이 지금 그대로라면 20년치 이익을 모아야 주가만큼 된다는 뜻이에요. 높다 낮다는 같은 업종 회사들과 비교해서 판단해요." },
];
export const COURSE: CourseQuestion[] = RAW.map(q => ({
  id: q.id, day: q.day, topic: q.topic, title: q.title, kind: q.kind, prompt: q.prompt,
  opts: q.opts ?? null,
  answer: typeof q.ans === "number" ? q.ans : null,
  answerSet: typeof q.ans === "function" ? q.ans() : null,
  band: q.band ? q.band() : null,
  tolerance: q.tol ?? null, count: q.count ?? null, bridge: q.bridge ?? null,
  fig: q.fig, hints: HINTS[q.id] || [], explanation: q.exp(),
}));
export const courseFor = (topic?: string | null): CourseQuestion[] => COURSE.filter(c => !topic || c.topic === topic);
