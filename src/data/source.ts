/* 화면이 데이터를 읽는 유일한 통로. 훅 하나 = 백엔드 엔드포인트 하나(계약 D1~D40).
   구현은 두 가지: src/data/mock/source.ts (목업 데이터), src/data/api/source.ts (실제 API, 지금은 대부분 미구현).
   VITE_DATA_SOURCE=mock|api 로 고른다. 기본은 mock. */
import { createContext, createElement, useContext, type ReactNode } from "react";
import type * as T from "../api/types";

export interface DataSource {
  readonly kind: "mock" | "api";

  /* 시장 */
  symbols(): Promise<T.SymbolsPayload>;                                         // D1
  heatmap(): Promise<T.HeatmapPayload>;                                         // D2
  indices(): Promise<T.IndicesPayload>;                                         // D3
  marketClock(): Promise<T.MarketClock>;                                        // D4
  movers(params: { sort: T.MoversSort; market?: "" | "kr" | "us"; limit?: number }): Promise<T.MoversPayload>;   // D5
  fx(): Promise<T.FxPayload>;                                                   // D6

  /* 종목 */
  candles(symbol: string, iv: T.CandleInterval): Promise<T.Candle[]>;           // D7
  live(symbol: string): { snapshot(): T.LiveQuote; subscribe(l: (q: T.LiveQuote) => void): () => void };   // D8 (WS)
  stockSummary(symbol: string): Promise<T.StockSummary>;                        // D9
  fundamentals(symbol: string, period?: "quarterly" | "annual"): Promise<T.FundamentalsPayload>;   // D10
  levels(symbol: string): Promise<T.Levels>;                                    // D11
  chartEvents(symbol: string): Promise<T.ChartEventsPayload>;                   // D12

  /* 뉴스·AI */
  news(query: T.NewsQuery): Promise<T.NewsListPayload>;                         // D13
  article(id: string): Promise<T.NewsArticle>;                                  // D13
  aiSummary(symbol: string): Promise<T.AiSummary>;                              // D14
  marketBrief(): Promise<T.MarketBrief>;                                        // D15
  agent: {                                                                      // D16
    ask(question: string, ctx: T.AgentContext): Promise<T.AgentView>;
    stop(): void;
    threads(): Promise<T.AgentThreadsPayload>;
    thread(threadId: string): Promise<T.AgentThread>;
  };

  /* 내 것 */
  watchlist(): Promise<T.WatchlistPayload>;                                     // D17
  setWatchlist(symbols: string[]): Promise<T.WatchlistPayload>;                 // D17
  recent(): Promise<T.RecentSymbolsPayload>;                                    // D18
  addRecent(symbol: string): Promise<void>;                                     // D18
  symbolSearch(text: string): Promise<T.SymbolSearchPayload>;                   // D19
  hotSymbols(): Promise<T.HotSymbolsPayload>;                                   // D19

  /* 계좌·주문·규칙 */
  account(): Promise<T.AccountSummary>;                                         // D20
  performance(): Promise<T.PerformancePayload>;                                 // D20
  activity(limit?: number): Promise<T.ActivityPayload>;                         // D20
  pretrade(req: T.OrderRequest): Promise<T.PretradePayload>;                    // D21
  placeOrder(req: T.OrderRequest): Promise<T.Order>;                            // D21
  orders(query: T.OrdersQuery): Promise<T.OrdersPayload>;                       // D22
  cancelOrder(orderId: string): Promise<void>;                                  // D22
  rules(): Promise<T.RulesPayload>;                                             // D23
  createRule(req: T.RuleRequest): Promise<T.Rule>;                              // D23
  patchRule(id: string, patch: Partial<Pick<T.Rule, "enabled">>): Promise<T.Rule>;   // D23
  deleteRule(id: string): Promise<void>;                                        // D23
  quickAlert(req: T.QuickAlertRequest): Promise<{ created: number }>;           // D24
  notifications(): Promise<T.NotificationsPayload>;                             // D25
  readAllNotifications(): Promise<void>;                                        // D25
  guardrails(): Promise<T.Guardrails>;                                          // D26
  patchGuardrails(patch: Partial<T.Guardrails>): Promise<T.Guardrails>;         // D26

  /* 복기·일정·코스 */
  review(month: string): Promise<T.ReviewPayload>;                              // D27
  saveReviewNote(orderId: string, note: T.ReviewNoteRequest): Promise<void>;    // D27
  calendar(query: T.CalendarQuery): Promise<T.CalendarPayload>;                 // D28
  calendarBrief(week?: string): Promise<T.CalendarBrief>;                       // D28
  course(courseId: string): Promise<T.CoursePayload>;                           // D29
  progress(courseId: string): Promise<T.ProgressPayload>;                       // D30
  postProgress(req: T.ProgressRequest): Promise<T.ProgressPayload>;             // D30

  /* 사용자 */
  profile(): Promise<T.Profile>;                                                // D32
  putProfile(patch: Partial<Pick<T.Profile, "experience">>): Promise<T.Profile>;   // D32
  recommendations(): Promise<T.RecommendationsPayload>;                         // D33
  preferences(): Promise<T.PreferencesPayload>;                                 // D34
  putPreferences(data: T.PreferencesData): Promise<T.PreferencesPayload>;       // D34
}

export class NotImplementedError extends Error {
  constructor(what: string) { super(`not implemented: ${what}`); this.name = "NotImplementedError"; }
}

const DataSourceContext = createContext<DataSource | null>(null);

export function DataSourceProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  return createElement(DataSourceContext.Provider, { value: source }, children);
}

export function useDataSource(): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) throw new Error("useDataSource must be used inside DataSourceProvider");
  return ds;
}

export type DataSourceKind = "mock" | "api";
/** 값이 없거나 틀리면 api(서버 인증)로 둔다. 목업 데이터·데모 사용자는 VITE_DATA_SOURCE=mock 을 명시했을 때만 쓴다 */
export function dataSourceKind(): DataSourceKind {
  return import.meta.env.VITE_DATA_SOURCE === "mock" ? "mock" : "api";
}
