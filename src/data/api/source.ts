/* 실제 백엔드로 가는 DataSource. 지금은 계약에 '있음'인 엔드포인트 중 바로 옮길 수 있는 것(관심 종목, 알림함, 환율, 지수, 검색)만 붙였고,
   나머지는 NotImplementedError 를 던진다. 페이지를 하나씩 옮기며 채운다. 요청 패턴은 src/market/heatmapApi.ts 와 같다. */
import type * as T from "../../api/types";
import { NotImplementedError, type DataSource } from "../source";
import { asString, readArray, readObject } from "../../shared/json";

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) }, ...init });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.status === 204 ? null : res.json();
}
const notImpl = (what: string) => () => Promise.reject(new NotImplementedError(what));

export const apiSource: DataSource = {
  kind: "api",

  symbols: notImpl("GET /api/market/symbols"),
  heatmap: notImpl("GET /api/market/heatmap"),
  async indices() {
    const src = readObject(await getJson("/api/market/indices")) ?? {};
    return { updatedAt: asString(src.updatedAt) ?? "", items: readArray(src.items).map(raw => { const r = readObject(raw) ?? {};
      return { symbol: asString(r.symbol) ?? "", nameKo: asString(r.nameKo) ?? "", value: Number(r.value) || 0, change: Number(r.change) || 0, changePercent: Number(r.changePercent) || 0, sparkline: readArray(r.sparkline).map(Number), why: null, flag: null }; }) };
  },
  marketClock: notImpl("GET /api/market/status"),
  movers: notImpl("GET /api/stocks/movers"),
  async fx() {
    const r = readObject(await getJson("/api/market/fx?pair=USDKRW")) ?? {};
    return { pair: "USDKRW", rate: Number(r.rate) || 0, asOf: asString(r.asOf) ?? "", source: asString(r.source) ?? "" };
  },

  candles: notImpl("GET /api/charts/candles"),
  live() { throw new NotImplementedError("WS /ws/charts"); },
  stockSummary: notImpl("GET /api/stocks/{symbol}/summary"),
  fundamentals: notImpl("GET /api/market/fundamentals/{symbol}/series"),
  levels: notImpl("GET /api/charts/analysis-assets"),
  chartEvents: notImpl("GET /api/charts/events"),

  news: notImpl("GET /api/market/news/latest"),
  article: notImpl("GET /api/news/{id}"),
  aiSummary: notImpl("GET /api/stocks/{symbol}/ai-summary"),
  marketBrief: notImpl("GET /api/market-brief/today"),
  agent: {
    ask: notImpl("POST /api/agents/analyze"),
    stop() { /* SSE 구독 취소는 analyze 를 붙일 때 같이 */ },
    threads: notImpl("GET /api/agents/threads"),
    thread: notImpl("GET /api/agents/threads/{id}"),
  },

  async watchlist() {
    const r = readObject(await getJson("/api/charts/watchlist")) ?? {};
    return { symbols: readArray(r.symbols).map(s => asString(typeof s === "string" ? s : readObject(s)?.symbol) ?? "").filter(Boolean), updatedAt: asString(r.updatedAt) ?? null };
  },
  async setWatchlist(symbols) {
    const r = readObject(await getJson("/api/charts/watchlist", { method: "PUT", body: JSON.stringify({ symbols }) })) ?? {};
    return { symbols: readArray(r.symbols).map(s => asString(typeof s === "string" ? s : readObject(s)?.symbol) ?? "").filter(Boolean), updatedAt: asString(r.updatedAt) ?? null };
  },
  recent: notImpl("GET /api/me/recent-symbols"),
  addRecent: notImpl("POST /api/me/recent-symbols"),
  async symbolSearch(text) {
    const r = readObject(await getJson(`/api/market/symbols/search?q=${encodeURIComponent(text)}`)) ?? {};
    return { items: readArray(r.items).map(raw => { const x = readObject(raw) ?? {};
      return { symbol: asString(x.symbol) ?? "", nameKo: asString(x.nameKo) ?? null, companyName: asString(x.companyName) ?? "", exchangeKo: asString(x.exchangeKo) ?? null, price: Number(x.price) || 0, changePercent: Number(x.changePercent) || 0 }; }) };
  },
  hotSymbols: notImpl("GET /api/charts/hot-symbols"),

  account: notImpl("GET /api/paper/account"),
  performance: notImpl("GET /api/account/performance"),
  activity: notImpl("GET /api/account/activity"),
  pretrade: notImpl("POST /api/paper/risk/pretrade"),
  placeOrder: notImpl("POST /api/paper/orders"),
  orders: notImpl("GET /api/paper/orders"),
  cancelOrder: notImpl("POST /api/paper/orders/{id}/cancel"),
  rules: notImpl("GET /api/alerts"),
  createRule: notImpl("POST /api/alerts"),
  patchRule: notImpl("PATCH /api/alerts/{id}"),
  deleteRule: notImpl("DELETE /api/alerts/{id}"),
  quickAlert: notImpl("POST /api/alerts"),
  async notifications() {
    const r = readObject(await getJson("/api/notifications")) ?? {};
    const items: T.Notification[] = readArray(r.items).map(raw => { const x = readObject(raw) ?? {};
      return { id: asString(x.id) ?? "", titleKo: asString(x.titleKo) ?? asString(x.title) ?? "", metaKo: asString(x.metaKo) ?? "", href: asString(x.href) ?? "/", read: x.read === true, at: asString(x.at) ?? "" }; });
    return { items, unreadCount: Number(r.unreadCount) || items.filter(n => !n.read).length };
  },
  async readAllNotifications() { await getJson("/api/notifications/read-all", { method: "PATCH" }); },
  guardrails: notImpl("GET /api/risk/settings"),
  patchGuardrails: notImpl("PATCH /api/risk/settings"),

  review: notImpl("GET /api/review/monthly"),
  saveReviewNote: notImpl("PUT /api/review/notes/{orderId}"),
  calendar: notImpl("GET /api/calendar"),
  calendarBrief: notImpl("GET /api/calendar/brief"),
  course: notImpl("GET /api/learn/courses/{courseId}"),
  progress: notImpl("GET /api/learn/progress"),
  postProgress: notImpl("POST /api/learn/progress"),

  profile: notImpl("GET /api/recommendations/profile"),
  putProfile: notImpl("PUT /api/recommendations/profile"),
  recommendations: notImpl("GET /api/recommendations/stocks/latest"),
  preferences: notImpl("GET /api/me/preferences"),
  putPreferences: notImpl("PUT /api/me/preferences"),
};
