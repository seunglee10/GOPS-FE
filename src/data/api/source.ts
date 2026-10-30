/* 실제 백엔드로 가는 DataSource. 계약에 '있음'인 엔드포인트부터 붙이고, 아직 못 옮긴 것은 NotImplementedError 를 던진다.
   요청은 ./http.ts (같은 출처 쿠키, { detail: { code } } 오류), 응답 모양 변환은 ./mappers.ts 에 둔다. */
import type * as T from "../../api/types";
import { NotImplementedError, type DataSource } from "../source";
import { asString, readArray, readObject } from "../../shared/json";
import { prefs } from "../../app/store";
import { getJson, guestEmpty, isUnauthorized, sendJson } from "./http";
import { mapArticle, mapHeatmap, mapHotSymbols, mapNewsList, mapRecent, mapSymbolSearch, mapWatchlist, mergeKoreanMatches, newsLatestUrl, sortNews, symbolsFromHeatmap } from "./mappers";

const notImpl = (what: string) => () => Promise.reject(new NotImplementedError(what));

/* heatmap 응답 하나를 시장 지도(D2)와 종목 마스터(D1, 이름·현재가 찾기)가 같이 쓴다. 30초 동안 다시 받지 않는다 */
const HEATMAP_TTL_MS = 30_000;
let heatmapCache: { at: number; p: Promise<unknown> } | null = null;
function heatmapRaw(): Promise<unknown> {
  if (heatmapCache && Date.now() - heatmapCache.at < HEATMAP_TTL_MS) return heatmapCache.p;
  const p = getJson("/api/market/heatmap?universe=sp500");
  heatmapCache = { at: Date.now(), p };
  p.catch(() => { if (heatmapCache?.p === p) heatmapCache = null; });
  return p;
}
/** 이름·현재가 보충용. 실패해도 검색·관심 목록은 서버 값만으로 보여 준다 */
async function masterLookup(): Promise<{ list: T.SymbolInfo[]; get: (s: string) => T.SymbolInfo | undefined }> {
  try {
    const list = symbolsFromHeatmap(await heatmapRaw()).items; const by = new Map(list.map(s => [s.symbol, s]));
    return { list, get: s => by.get(s) };
  } catch { return { list: [], get: () => undefined }; }
}
const SEARCH_LIMIT = 8;

export const apiSource: DataSource = {
  kind: "api",

  async symbols() { return symbolsFromHeatmap(await heatmapRaw()); },
  async heatmap() { return mapHeatmap(await heatmapRaw()); },
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

  async news(query) {
    const { items } = mapNewsList(await getJson(newsLatestUrl(query)), new Date());
    const sorted = sortNews(items, query.sort);
    return { items: query.limit ? sorted.slice(0, query.limit) : sorted };
  },
  async article(id) {
    const a = mapArticle(await getJson(`/api/news/${encodeURIComponent(id)}`), new Date());
    if (!a) throw new Error("news_not_found");
    return a;
  },
  aiSummary: notImpl("GET /api/stocks/{symbol}/ai-summary"),
  marketBrief: notImpl("GET /api/market-brief/today"),
  agent: {
    ask: notImpl("POST /api/agents/analyze"),
    stop() { /* SSE 구독 취소는 analyze 를 붙일 때 같이 */ },
    threads: notImpl("GET /api/agents/threads"),
    thread: notImpl("GET /api/agents/threads/{id}"),
  },

  /* D17·D18: 로그인하지 않았으면(401) 빈 목록. 쓰기는 로그인한 사람만 하므로 401 을 그대로 던진다 (기록 남기기는 조용히 넘긴다) */
  watchlist() { return guestEmpty(async () => mapWatchlist(await getJson("/api/charts/watchlist")), { symbols: [], updatedAt: null }); },
  async setWatchlist(symbols) { return mapWatchlist({ persisted: true, ...readObject(await sendJson("/api/charts/watchlist", "PUT", { symbols })) }); },
  recent() { return guestEmpty(async () => mapRecent(await getJson("/api/me/recent-symbols")), { items: [] }); },
  async addRecent(symbol) {
    try { await sendJson("/api/me/recent-symbols", "POST", { symbol }); }
    catch (e) { if (!isUnauthorized(e)) throw e; }
  },
  async symbolSearch(text) {
    const q = text.trim(); if (!q) return { items: [] };
    const [raw, master] = await Promise.all([getJson(`/api/market/symbols/search?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`), masterLookup()]);
    return { items: mergeKoreanMatches(mapSymbolSearch(raw, master.get).items, q, master.list, SEARCH_LIMIT) };
  },
  async hotSymbols() {
    const [raw, master] = await Promise.all([getJson("/api/charts/hot-symbols?limit=10"), masterLookup()]);
    return mapHotSymbols(raw, master.get);
  },

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

  /* D32 투자 경험. /api/recommendations/profile 은 riskLevel·recommendationStyle·horizon 이 필수인 추천 설정이라
     experience 를 담을 자리가 없다. 서버에 자리가 생기기 전까지 이름·이메일은 /api/auth/me, 경험은 gops.exp 에 둔다 */
  async profile() {
    const user = readObject(readObject(await getJson("/api/auth/me"))?.user) ?? {};
    const exp = asString(user.experience);
    const email = asString(user.email) ?? null;
    const owner = email ?? asString(user.sub) ?? null;
    if (owner && prefs.expOwner.get() !== owner) { prefs.exp.set(null); prefs.expOwner.set(owner); }
    return { name: asString(user.name) ?? email?.split("@")[0] ?? "", email, initials: "SL", experience: exp === "new" || exp === "some" || exp === "pro" ? exp : (owner ? prefs.exp.get() : null) };
  },
  async putProfile(patch) {
    if ("experience" in patch) prefs.exp.set(patch.experience ?? null);
    return this.profile();
  },
  recommendations: notImpl("GET /api/recommendations/stocks/latest"),
  preferences: notImpl("GET /api/me/preferences"),
  putPreferences: notImpl("PUT /api/me/preferences"),

  /* v1 은 미국 종목만이고 기관·공매도 데이터가 없다: 화면은 '제공하지 않아요' 상태를 그린다 */
  async investorFlows() { return null; },
  compare: notImpl("GET /api/stocks/compare"),
};
