/* GOPS-BE docs/MOCK_API_CONTRACT.md 의 D1~D40 응답 모양.
   JSON 키는 camelCase, 시각은 UTC ISO 8601 문자열, 금액은 달러 숫자(원화 환산은 프론트가 D6 환율로 한다).
   계약이 바뀌면 이 파일을 같은 PR 에서 고친다. */

export type IsoDateTime = string;   // "2026-10-30T20:00:00Z"
export type IsoDate = string;       // "2026-10-30"

/* ---------- D1 종목 마스터 ---------- */
export type SymbolInfo = {
  symbol: string;
  companyName: string;
  nameKo: string | null;
  exchange: string;
  exchangeKo: string | null;
  sector: string | null;
  sectorLabelKo: string | null;
  /** 목업 S 에 있던 현재가·등락·시총·회사 색. /symbols 목록과 heatmap items 가 같이 준다 */
  price: number;
  changePercent: number;
  marketCap: number | null;   // 달러
  color?: string | null;
};
export type SymbolsPayload = { items: SymbolInfo[] };

/* ---------- D2 섹터·트리맵 ---------- */
export type HeatmapItem = {
  symbol: string;
  nameKo: string | null;
  sectorLabelKo: string;
  marketCap: number;          // 달러
  changePercent: number;
  changePercent1w?: number | null;
  changePercent1m?: number | null;
};
export type HeatmapPayload = {
  universe: string;
  generatedAt: IsoDateTime;
  items: HeatmapItem[];
};

/* ---------- D3 지수 ---------- */
export type IndexItem = {
  symbol: string;             // "^GSPC", "^IXIC", "^DJI", "^VIX", "KRW=X", "^TNX"
  nameKo: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];        // 최근 종가 30개(오래된 것부터). 없으면 []
  /** 목업 MKT 꼬리표(오늘 움직인 이유)와 급하락 같은 표시. API 는 비워 둘 수 있다 */
  why?: string | null;
  flag?: string | null;
};
export type IndicesPayload = { updatedAt: IsoDateTime; items: IndexItem[] };

/* ---------- D4 장 상태 ---------- */
export type MarketSession = { label: string; open: string; close: string; isOpen: boolean };
export type MarketClock = {
  status: "open" | "closed" | "pre" | "after";
  nextOpenAt: IsoDateTime | null;
  sessions: MarketSession[];
};

/* ---------- D5 홈 순위표 ---------- */
export type MoversSort = "trade" | "volume" | "up" | "down";
export type MoverItem = {
  symbol: string;
  nameKo: string | null;
  price: number;
  changePercent: number;
  dollarVolume: number | null;
  volume: number | null;
  marketCap: number | null;
  volumeRatio20d: number | null;
  issue: string | null;
  issueNewsId: string | null;
  issueSource?: string | null;   // 목업 WHY[1] ("뉴스 3", "차트")
  chartNote: string | null;
  /** 국내 종목(KR_S)이면 KRW. v1 API 는 USD 만 준다 */
  currency?: "USD" | "KRW";
};
export type MoversPayload = { asOf: IsoDateTime; items: MoverItem[] };

/* ---------- D6 환율 ---------- */
export type FxPayload = { pair: "USDKRW"; rate: number; asOf: IsoDateTime; source: string };

/* ---------- D7 캔들 ---------- */
export type CandleInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "60m" | "D" | "W" | "M" | "Y";
export type Candle = {
  t: Date;
  o: number; h: number; l: number; c: number;
  v: number;                   // 목업 candlesOf 단위: 1 = 100만 주
  short?: number; inst?: number; foreign?: number; retail?: number;   // 투자자별 흐름(미국 종목은 데이터 없음)
};

/* ---------- D8 실시간 ---------- */
export type LiveTick = { t: Date; p: number; q: number; up: boolean };
export type LiveQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  volume: number;
  ticks: LiveTick[];
  book: number[];              // 목업 16단. API 는 bid/ask 1단만
  bid?: number | null;
  ask?: number | null;
  strength: number;            // 체결강도 %
};

/* ---------- D9 종목 요약 ---------- */
export type PeerPer = { symbol: string; nameKo: string | null; per: number | null };
export type StockSummary = {
  symbol: string;
  nameKo: string | null;
  exchangeKo: string | null;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  marketCapRank: number | null;
  per: number | null;
  sectorPer: number | null;
  sectorLabelKo: string | null;
  low52: number | null;
  high52: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  volume: number | null;
  avgVolume20d: number | null;
  volumeRatio20d: number | null;
  dollarVolume: number | null;
  peers: PeerPer[];
  asOf: IsoDateTime;
};

/* ---------- D10 분기 매출·수익성 ---------- */
export type FundamentalsPoint = {
  period: string;              // "2026Q2"
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  operatingMargin: number | null;
  eps: number | null;
};
export type FundamentalsPayload = { symbol: string; period: "quarterly" | "annual"; items: FundamentalsPoint[] };

/* ---------- D11 지지·저항 ---------- */
export type Levels = { sup: number; res: number; target?: number | null; stop?: number | null };

/* ---------- D12 실적일·차트 이벤트 ---------- */
export type ChartEvent = { t: Date; k: "earn" | "news"; title: string; n?: number; newsId?: string | null };
export type UpcomingEvent = { at: Date; title: string; mine: boolean };
export type ChartEventsPayload = { symbol: string; events: ChartEvent[]; upcoming: UpcomingEvent[]; nextEarningsAt: Date };

/* ---------- D13 뉴스 ---------- */
export type NewsCategory = "market" | "corp" | "earn" | "rate" | "etf" | "global";
export type NewsSymbolRef = { symbol: string; nameKo: string | null };
export type NewsItem = {
  id: string;
  titleKo: string;
  source: string;
  publishedAt: IsoDateTime;
  /** 목업 상대 시각("2시간 전"). 마지막 거래일 기준 */
  relativeKo: string;
  category: NewsCategory;
  relatedSymbols: NewsSymbolRef[];
  isHot: boolean;
  url?: string | null;
};
export type NewsListPayload = { items: NewsItem[] };
export type NewsArticle = NewsItem & { bodyKo: string[] };
export type NewsQuery = { category?: NewsCategory; symbols?: string[]; limit?: number; sort?: "new" | "hot" };

/* ---------- D14 종목 AI 요약 ---------- */
export type AiSummaryRef = { text: string; newsId: string | null };
export type AiSummaryEvent = { title: string; at: IsoDate; note: string | null; dday: number };
export type AiSummary = {
  symbol: string;
  generatedAt: IsoDateTime;
  head: string;
  news: AiSummaryRef[];
  risks: AiSummaryRef[];
  events: AiSummaryEvent[];
  chartNote: string | null;
  /** 머리말 옆 작은 글씨("뉴스 3건 · 일정 2건 · 9/30 마감 기준") */
  meta: string;
};

/* ---------- D15 오늘 시장 요약 ---------- */
export type MarketBriefRef = { kind: "symbol" | "news" | "event"; value: string };
export type MarketBrief = {
  marketDate: IsoDate;
  generatedAt: IsoDateTime;
  paragraphs: { text: string; refs: MarketBriefRef[] }[];
};

/* ---------- D16 AI 대화 ---------- */
export type AgentContext = { page: string; symbol: string | null; chips: string[] };
export type AgentEvidence = { kind: "news" | "chart" | "fin"; ref: string; label: string };
export type AgentSuggestion =
  | { kind: "rule"; label: string; payload: { symbol: string; price: number; dir?: "above" | "below" } }
  | { kind: "compare"; label: string; symbols: string[] };
export type AgentView = {
  conclusion: string;
  sections: { title: string; body: string | null; evidence: AgentEvidence[]; kv?: { k: string; v: string; sub?: string }[] }[];
  steps: string[];
  confidence: "높음" | "보통" | "낮음";
  evidenceCount: number;
  suggestions: AgentSuggestion[];
};
export type AgentProgressStep = { label: string; state: "done" | "now" | "todo" };
export type AgentMessage =
  | { role: "user"; text: string; at: string; ctx: string[] }
  | { role: "assistant"; view: AgentView };
export type AgentThread = { threadId: string; title: string; symbol: string | null; updatedAt: IsoDateTime; messages: AgentMessage[] };
export type AgentThreadsPayload = { items: Pick<AgentThread, "threadId" | "title" | "symbol" | "updatedAt">[] };
export type AgentState = "new" | "loading" | "answer";

/* ---------- D17 관심 종목 ---------- */
export type WatchlistPayload = { symbols: string[]; updatedAt: IsoDateTime | null };

/* ---------- D18 최근 본 종목 ---------- */
export type RecentSymbol = { symbol: string; nameKo: string | null; viewedAt: IsoDateTime };
export type RecentSymbolsPayload = { items: RecentSymbol[] };

/* ---------- D19 종목 검색 ---------- */
export type SymbolSearchItem = { symbol: string; nameKo: string | null; companyName: string; exchangeKo: string | null; price: number; changePercent: number };
export type SymbolSearchPayload = { items: SymbolSearchItem[] };
export type HotSymbolsPayload = { items: SymbolSearchItem[] };

/* ---------- D20 계좌 ---------- */
export type Holding = { symbol: string; nameKo: string | null; qty: number; avgPrice: number; price: number; changePercent: number; sectorLabelKo: string | null };
export type AccountSummary = {
  totalValue: number;          // 총 평가 금액
  cash: number;                // 주문 가능 현금
  todayPnl: number;
  todayReturnPercent: number;
  cumulativeReturnPercent: number;
  openedAt: IsoDate;
  benchmarkReturnPercent: number;   // 같은 기간 S&P 500
  holdings: Holding[];
};
export type PerformancePoint = { date: IsoDate; accountReturnPercent: number; benchmarkReturnPercent: number };
export type PerformancePayload = { items: PerformancePoint[] };
export type ActivityKind = "fill" | "rule" | "dividend" | "deposit";
export type ActivityItem = { at: string; kind: ActivityKind; symbol: string | null; nameKo: string | null; text: string; sub: string | null; ref: { orderId?: string; ruleId?: string } | null };
export type ActivityPayload = { items: ActivityItem[] };

/* ---------- D21 주문 ---------- */
export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market" | "conditional";
export type OrderRequest = { symbol: string; side: OrderSide; type: OrderType; qty: number; price: number | null; memo: string | null };
export type PretradeCheckCode = "cash" | "chase_buy" | "avg_down_no_stop" | "sell_on_drop" | "position_weight";
export type PretradeCheck = { code: PretradeCheckCode; ok: boolean; warn: boolean; text: string; sub: string | null };
export type PretradePayload = { checks: PretradeCheck[]; maxQty: number; weightPercent: number };
export type OrderStatus = "pending" | "filled" | "cancelled";
export type Order = { orderId: string; at: string; symbol: string; side: OrderSide; type: OrderType; qty: number; price: number; status: OrderStatus; memo: string | null };

/* ---------- D22 주문 내역 ---------- */
export type OrdersQuery = { status?: "all" | OrderStatus; page?: number; size?: number };
export type OrdersPayload = { items: Order[]; total: number; page: number; size: number };

/* ---------- D23 규칙 ---------- */
export type RuleSource = "agent" | "chart" | "user" | "default";
export type RuleAction = "notify" | "order";
export type Rule = {
  id: string;
  symbol: string;              // "시장" 은 시장 전체 규칙
  condKo: string;              // "가격이 $150.00 위로 돌파"
  actKo: string;               // "알림", "알림, 10주 매수 예약"
  source: RuleSource;
  sourceKo: string;            // "에이전트 제안", "차트", "직접 만듦", "기본 설정"
  enabled: boolean;
  statusKo: string;            // "대기 중", "9/24 발동", "꺼짐", "매일"
};
export type RuleRequest = {
  symbol: string;
  cond: "price" | "change" | "volume" | "rsi";
  dir: "above" | "below";
  price: number;
  action: RuleAction;
  repeat: 1 | 3 | 0;           // 0 = 계속
  source: RuleSource;
};
export type RulesPayload = { items: Rule[] };

/* ---------- D24 빠른 가격 알림 ---------- */
export type QuickAlertRequest = { symbol: string; prices: number[] };

/* ---------- D25 알림함 ---------- */
export type Notification = { id: string; titleKo: string; metaKo: string; href: string; read: boolean; at: IsoDateTime };
export type NotificationsPayload = { items: Notification[]; unreadCount: number };

/* ---------- D26 가드레일 ---------- */
export type Guardrails = {
  chaseBuyWarnPercent: number | null;        // g1: null 이면 끔
  blockAverageDownWithoutStop: boolean;      // g3
  confirmSellOnDropPercent: number | null;   // g4
  maxPositionWeightPercent: number;          // 25
};

/* ---------- D27 투자 복기 ---------- */
export type Habit = "plan" | "chase" | "rush" | "avg" | "news" | "exit";
export type ReviewTrade = {
  orderId: string;
  at: string;                  // "9/02"
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
  avgPriceAtSell: number | null;
  now: number;
  pnl: number;
  returnPercent: number;
  missedProfit: number;
  habit: Habit;
  memo: string;
};
export type ReviewPayload = {
  month: string;
  kpi: { realizedPnl: number; returnPercent: number; winRate: number; tradeCount: number; missedProfit: number; avgWinLossRatio: number; mistakePnl: number };
  prevMonth: { realizedPnl: number; winRate: number; avgWinLossRatio: number; mistakePnl: number; gapPercent: number };
  benchmark: { spxReturnPercent: number };
  byHabit: { habit: Habit; labelKo: string; count: number; wins: number; pnl: number; missedProfit: number }[];
  trades: ReviewTrade[];
};
export type ReviewNoteRequest = { memo: string; habit: Habit };

/* ---------- D28 캘린더 ---------- */
export type CalendarKind = "econ" | "earn";
export type CalendarRegion = "kr" | "us";
export type CalendarItem = {
  id: string;
  date: IsoDate;
  kind: CalendarKind;
  region: CalendarRegion;
  title: string;
  level: "주요" | "관심" | null;
  symbol: string | null;
  nameKo: string | null;
  call: boolean;
  at: string | null;           // "오후 9시 30분 발표 예정"
  done: string | null;         // "발표 완료"
  actual: string | null;
  forecast: string | null;
  previous: string | null;
};
export type CalendarQuery = { from: IsoDate; to: IsoDate; kind?: CalendarKind; region?: CalendarRegion };
export type CalendarPayload = { items: CalendarItem[]; today: IsoDate };
export type CalendarBrief = { week: string; text: string };

/* ---------- D29 코스 ---------- */
export type CourseChartRow = [date: string, o: number, h: number, l: number, c: number, v: number];
export type CourseChart = { sym: string; name: string; iv: string; split?: string; rows: CourseChartRow[] };
export type CourseFig = {
  chart?: string; type?: "diagram" | "volbars" | "rsibars" | "per"; mark?: string; prev?: boolean; mono?: boolean;
  vol?: boolean; rsi?: boolean; level?: number; day?: string;
};
export type CourseQuestion = {
  id: string;
  day: number;
  topic: "candle" | "trend" | "sup" | "vol" | "rsi" | "per";
  title: string;
  kind: "choice" | "tap" | "level";
  prompt: string;
  opts: string[] | null;
  answer: number | null;       // choice 정답 번호
  answerSet: number[] | null;  // tap 정답(행 번호)
  band: [number, number] | null;   // level 정답 가격대
  tolerance: number | null;
  count: number | null;
  bridge: string | null;
  fig: CourseFig;
  hints: string[];
  explanation: string;
};
export type CoursePayload = {
  courseId: string;
  titleKo: string;
  days: { day: number; titleKo: string }[];
  questions: CourseQuestion[];
  charts: Record<string, CourseChart>;
};

/* ---------- D30 코스 진행 ---------- */
export type ProgressPayload = { solved: string[]; total: number };
export type ProgressRequest = { courseId: string; questionId: string; correct: boolean };

/* ---------- D32 투자 경험 ---------- */
export type Experience = "new" | "some" | "pro";
export type Profile = { name: string; email: string | null; initials: string; experience: Experience | null };

/* ---------- D33 오늘의 추천 ---------- */
export type RecommendationItem = { symbol: string; nameKo: string | null; reason: string; score?: number | null };
export type RecommendationsPayload = { generatedAt: IsoDateTime; items: RecommendationItem[] };

/* ---------- D34 화면 설정 ---------- */
export type PreferencesData = {
  layout?: unknown; chart?: unknown; draw?: unknown; cur?: string | null; sideW?: number | null; dwW?: number | null; brand?: string | null;
};
export type PreferencesPayload = { version: number; updatedAt: IsoDateTime | null; data: PreferencesData };

/* ---------- D35~D40 계정 ---------- */
export type AuthProviderKind = "google" | "kakao" | "email";
export type AuthUser = {
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: AuthProviderKind;
  emailVerified: boolean;
  needsConsent: boolean;
  experience: Experience | null;
};
export type AuthMePayload = { authEnabled: boolean; user: AuthUser | null };
export type Consents = { tos: boolean; privacy: boolean; age: boolean; mkt: boolean };
export type SignupRequest = { email: string; password: string; consents: Consents };
export type SignupResponse = { verificationRequired: true; resendAfterSeconds: number };
export type VerifyRequest = { email: string; code: string };
export type ResendResponse = { resendAfterSeconds: number };
export type LoginRequest = { email: string; password: string; remember: boolean };
export type LoginResponse = { user: AuthUser };
export type ForgotResponse = { sent: true };
export type ResetRequest = { token: string; password: string };
export type ResetResponse = { reset: true };
export type ConsentResponse = { needsConsent: false };
export type AuthErrorCode =
  | "email_taken" | "weak_password" | "consent_required"
  | "invalid_code" | "expired" | "too_soon"
  | "invalid_credentials" | "locked" | "unverified" | "invalid_token";
export type AuthError = { code: AuthErrorCode; remainingAttempts?: number; lockedUntil?: IsoDateTime; retryAfterSeconds?: number };
/* 오류 응답은 FastAPI HTTPException 관례대로 { detail: { code, ... } } 로 온다. 계약서의 { code } 표기는 detail 안의 내용 */
export type ApiErrorEnvelope<T = { code: string }> = { detail: T };
