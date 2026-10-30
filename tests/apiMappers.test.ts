import assert from "node:assert/strict";
import {
  groupRecentByDay, mapArticle, mapHeatmap, mapHotSymbols, mapNewsList, mapRecent, mapSymbolSearch, mapWatchlist,
  mergeKoreanMatches, newsLatestUrl, num, relativeKo, sortNews, symbolsFromHeatmap,
} from "../src/data/api/mappers";
import { ApiError, errorCode, guestEmpty, getJson, isNotFound, isUnauthorized, sendJson } from "../src/data/api/http";
import { apiSource } from "../src/data/api/source";

const NOW = new Date("2026-10-30T12:00:00Z");

/* 백엔드 응답과 같은 모양의 고정 데이터 (GOPS-BE 라우트 코드 기준) */
const HEATMAP = { source: "market-heatmap-seed", cacheStatus: "seed", universe: "sp500", generatedAt: "2026-10-30T11:59:00Z", items: [
  { symbol: "NVDA", companyName: "NVIDIA Corp", sector: "Information Technology", sectorLabelKo: "정보기술", marketCap: 3.48e12, lastPrice: 142.3, changePercent: 2.12, nameKo: "엔비디아", exchangeKo: "나스닥" },
  { symbol: "aapl", companyName: "Apple Inc", sector: "Information Technology", sectorLabelKo: "정보기술", marketCap: null, layoutMarketCap: 3.1e12, lastPrice: null, changePercent: null, nameKo: "애플", exchangeKo: "나스닥" },
  { symbol: "ZZZ", companyName: "No Cap", sector: null, marketCap: null, nameKo: null, exchangeKo: null },
] };

/* 숫자 읽기: null·빈 문자열을 0 으로 바꾸지 않는다 */
{
  assert.equal(num(1.5), 1.5); assert.equal(num("2"), 2); assert.equal(num(null), null); assert.equal(num(""), null); assert.equal(num(NaN), null); assert.equal(num("x"), null);
}

/* D2 heatmap: 시총이 없으면 layoutMarketCap, 둘 다 없으면 칸을 뺀다. 티커는 대문자 */
{
  const h = mapHeatmap(HEATMAP);
  assert.equal(h.universe, "sp500"); assert.equal(h.generatedAt, "2026-10-30T11:59:00Z");
  assert.deepEqual(h.items.map(i => i.symbol), ["NVDA", "AAPL"]);
  assert.equal(h.items[1].marketCap, 3.1e12); assert.equal(h.items[1].changePercent, 0);
  assert.equal(h.items[0].nameKo, "엔비디아"); assert.equal(h.items[0].sectorLabelKo, "정보기술");
  assert.deepEqual(mapHeatmap(null), { universe: "sp500", generatedAt: "", items: [] });
}

/* D1 종목 마스터는 heatmap 에서 */
{
  const s = symbolsFromHeatmap(HEATMAP).items;
  assert.equal(s.length, 3);
  assert.deepEqual({ ...s[0] }, { symbol: "NVDA", companyName: "NVIDIA Corp", nameKo: "엔비디아", exchange: "", exchangeKo: "나스닥", sector: "Information Technology", sectorLabelKo: "정보기술", price: 142.3, changePercent: 2.12, marketCap: 3.48e12 });
  assert.equal(s[2].companyName, "No Cap"); assert.equal(s[2].nameKo, null); assert.equal(s[2].price, 0);
}

/* D19 검색: 서버는 symbols 키, 가격이 없으면 종목 마스터에서 */
{
  const master = symbolsFromHeatmap(HEATMAP).items; const by = new Map(master.map(m => [m.symbol, m]));
  const raw = { source: "alpaca", query: "nv", symbols: [{ symbol: "NVDA", name: "NVIDIA Corp", exchange: "NASDAQ", nameKo: "엔비디아", exchangeKo: "나스닥" }, { symbol: "NVR", name: "NVR Inc", exchange: "NYSE", nameKo: null, exchangeKo: null }, { name: "no symbol" }] };
  const r = mapSymbolSearch(raw, s => by.get(s)).items;
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { symbol: "NVDA", nameKo: "엔비디아", companyName: "NVIDIA Corp", exchangeKo: "나스닥", price: 142.3, changePercent: 2.12 });
  assert.deepEqual(r[1], { symbol: "NVR", nameKo: null, companyName: "NVR Inc", exchangeKo: null, price: 0, changePercent: 0 });
  assert.deepEqual(mapSymbolSearch({ items: [{ symbol: "AMD", companyName: "AMD", price: 150, changePercent: -1 }] }).items[0].price, 150);
  /* 한글로 찾으면 마스터 한글명에서 더 찾는다. 겹치면 한 번만 */
  const merged = mergeKoreanMatches([], "애플", master, 8);
  assert.deepEqual(merged.map(m => m.symbol), ["AAPL"]);
  assert.deepEqual(mergeKoreanMatches(r, "엔비", master, 8).map(m => m.symbol), ["NVDA", "NVR"]);
  assert.deepEqual(mergeKoreanMatches(r, "nv", master, 1).map(m => m.symbol), ["NVDA"]);
}

/* D19 많이 찾는 종목: lastPrice·changePercent, 한글명은 마스터에서 */
{
  const raw = { ranking: { method: "current_session_dollar_volume" }, symbols: [{ rank: 1, symbol: "NVDA", name: "NVIDIA Corp", market: "US", lastPrice: 140, changePercent: 1.2, volume: 1 }, { rank: 2, symbol: "TSLA", name: "Tesla", lastPrice: null, changePercent: null }] };
  const by = new Map(symbolsFromHeatmap(HEATMAP).items.map(m => [m.symbol, m]));
  const h = mapHotSymbols(raw, s => by.get(s)).items;
  assert.deepEqual(h[0], { symbol: "NVDA", nameKo: "엔비디아", companyName: "NVIDIA Corp", exchangeKo: "나스닥", price: 140, changePercent: 1.2 });
  assert.equal(h[1].nameKo, null); assert.equal(h[1].price, 0);
  /* 시세가 없어 서버가 유니버스 앞쪽으로 채운 목록은 빈 목록 */
  assert.deepEqual(mapHotSymbols({ symbols: [{ rank: 1, symbol: "A", name: "A", lastPrice: null, changePercent: null, rankReason: "no_data_fallback" }] }).items, []);
  /* name 이 티커와 같으면(시세 없음) 마스터의 회사명 */
  assert.equal(mapSymbolSearch({ symbols: [{ symbol: "NVDA", name: "NVDA", nameKo: "엔비디아" }] }, s => by.get(s)).items[0].companyName, "NVIDIA Corp");
}

/* D17 관심 종목: 요약 객체 배열 → 티커. persisted:false(서버 기본 목록)는 빈 목록 */
{
  assert.deepEqual(mapWatchlist({ source: "alpaca", persisted: true, symbols: [{ symbol: "NVDA", name: "NVIDIA", lastPrice: 1 }, { symbol: "aapl" }, "MSFT", { symbol: "NVDA" }] }), { symbols: ["NVDA", "AAPL", "MSFT"], updatedAt: null });
  assert.deepEqual(mapWatchlist({ persisted: false, symbols: [{ symbol: "SPY" }] }), { symbols: [], updatedAt: null });
  assert.deepEqual(mapWatchlist(null), { symbols: [], updatedAt: null });
}

/* D18 최근 본 종목 */
{
  const r = mapRecent({ items: [{ symbol: "NVDA", nameKo: "엔비디아", viewedAt: "2026-10-30T10:00:00.000Z" }, { symbol: "TSLA", nameKo: null, viewedAt: "2026-10-29T10:00:00.000Z" }, { symbol: "X" }, { symbol: "OLD", viewedAt: "2026-10-01T00:00:00Z" }] });
  assert.equal(r.items.length, 3);
  const local = new Date(2026, 9, 30, 15, 0);
  const g = groupRecentByDay([
    { symbol: "A", nameKo: null, viewedAt: new Date(2026, 9, 30, 9, 0).toISOString() },
    { symbol: "B", nameKo: null, viewedAt: new Date(2026, 9, 29, 23, 0).toISOString() },
    { symbol: "C", nameKo: null, viewedAt: new Date(2026, 9, 20).toISOString() },
    { symbol: "D", nameKo: null, viewedAt: "bad" },
  ], local);
  assert.deepEqual([g.today.map(x => x.symbol), g.yesterday.map(x => x.symbol), g.earlier.map(x => x.symbol)], [["A"], ["B"], ["C"]]);
}

/* D13 뉴스 목록: id 는 articleId, 분류 모르면 corp, 같은 기사는 한 번, id·제목 없으면 뺀다 */
{
  const raw = { symbol: "NVDA", symbols: ["NVDA"], source: "redis", items: [
    { articleId: "a1", symbol: "NVDA", symbols: ["NVDA", "AMD"], title: "Nvidia ...", summary: "요약", url: "https://www.reuters.com/x", source: "Reuters", publishedAt: "2026-10-30T11:30:00Z", category: "corp", relatedSymbols: [{ symbol: "NVDA", nameKo: "엔비디아" }, { symbol: "AMD", nameKo: null }], titleKo: "엔비디아 데이터센터 매출 늘어", isHot: true },
    { articleId: "a2", title: "Fed", source: "AP", publishedAt: "2026-10-30T09:00:00Z", category: "weird", relatedSymbols: [], titleKo: "연준 금리 동결", isHot: false },
    { articleId: "a1", titleKo: "중복", publishedAt: "2026-10-30T11:30:00Z" },
    { articleId: null, titleKo: "id 없음" },
    { articleId: "a3", titleKo: "", title: "" },
    { articleId: "a4", titleKo: "어제 기사", source: "CNBC", publishedAt: "2026-10-29T11:00:00Z", category: "rate", relatedSymbols: [{ symbol: "spy" }], isHot: true },
  ] };
  const n = mapNewsList(raw, NOW).items;
  assert.deepEqual(n.map(x => x.id), ["a1", "a2", "a4"]);
  assert.deepEqual(n[0], { id: "a1", titleKo: "엔비디아 데이터센터 매출 늘어", source: "Reuters", publishedAt: "2026-10-30T11:30:00Z", relativeKo: "30분 전", category: "corp", relatedSymbols: [{ symbol: "NVDA", nameKo: "엔비디아" }, { symbol: "AMD", nameKo: null }], isHot: true, url: "https://www.reuters.com/x" });
  assert.equal(n[1].category, "corp"); assert.equal(n[1].relativeKo, "3시간 전");
  assert.equal(n[2].relatedSymbols[0].symbol, "SPY"); assert.equal(n[2].relativeKo, "1일 전");
  /* 조회 수·등락률 필드는 응답에 있어도 옮기지 않는다 */
  assert.ok(!("views" in n[0]) && !("changePercent" in n[0].relatedSymbols[0]));
  /* 정렬: new 는 최신순, hot 은 isHot 먼저 */
  assert.deepEqual(sortNews(n, "new").map(x => x.id), ["a1", "a2", "a4"]);
  assert.deepEqual(sortNews(n, "hot").map(x => x.id), ["a1", "a4", "a2"]);
}

/* 상대 시각 */
{
  assert.equal(relativeKo("2026-10-30T11:59:40Z", NOW), "방금");
  assert.equal(relativeKo("2026-10-30T11:48:00Z", NOW), "12분 전");
  assert.equal(relativeKo("2026-10-27T12:00:00Z", NOW), "3일 전");
  assert.match(relativeKo("2026-10-01T12:00:00Z", NOW), /^10월 1일$/);
  assert.equal(relativeKo("", NOW), "");
}

/* D13 본문: bodyKo 문단, 빈 문단은 뺀다 */
{
  const a = mapArticle({ id: "a1", titleKo: "제목", source: "Reuters", publishedAt: "2026-10-30T11:00:00Z", url: "javascript:alert(1)", category: "earn", relatedSymbols: [{ symbol: "NVDA", nameKo: "엔비디아" }], bodyKo: ["문단1", " ", "문단2", 3] }, NOW)!;
  assert.deepEqual(a.bodyKo, ["문단1", "문단2"]);
  assert.equal(a.isHot, false); assert.equal(a.category, "earn"); assert.equal(a.relativeKo, "1시간 전");
  assert.equal(a.url, "javascript:alert(1)");   // 걸러 내는 건 화면의 safeExternalUrl 몫
  assert.equal(mapArticle({}, NOW), null);
}

/* 뉴스 쿼리 주소: limit 상한 30, 인기순은 30개 받아서 줄 세운다, symbols 20개까지 */
{
  assert.equal(newsLatestUrl({}), "/api/market/news/latest?limit=30");
  assert.equal(newsLatestUrl({ category: "rate", limit: 5 }), "/api/market/news/latest?category=rate&limit=5");
  assert.equal(newsLatestUrl({ sort: "hot", limit: 5 }), "/api/market/news/latest?limit=30");
  assert.equal(newsLatestUrl({ symbols: ["nvda", "AMD", "NVDA", " "] , limit: 99 }), "/api/market/news/latest?symbols=NVDA%2CAMD&limit=30");
  const many = Array.from({ length: 25 }, (_, i) => `S${i}`);
  assert.equal(new URLSearchParams(newsLatestUrl({ symbols: many }).split("?")[1]).get("symbols")!.split(",").length, 20);
}

/* 오류 본문 { detail: { code } } */
{
  assert.equal(errorCode({ detail: { code: "news_not_found" } }), "news_not_found");
  assert.equal(errorCode({ detail: "authentication required" }), null);
  assert.equal(errorCode(null), null);
}

/* fetch 를 바꿔 끼워 http·apiSource 확인 */
type Call = { url: string; init: RequestInit };
const calls: Call[] = [];
let respond: (url: string, init: RequestInit) => Response | Promise<Response> = () => new Response("null");
globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return respond(url, init); }) as typeof fetch;
const json = (status: number, body: unknown) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

{
  respond = () => json(404, { detail: { code: "news_not_found" } });
  const e = await getJson("/api/news/x").catch(err => err);
  assert.ok(e instanceof ApiError); assert.equal(e.status, 404); assert.equal(e.code, "news_not_found"); assert.ok(isNotFound(e));
  assert.equal(calls.at(-1)!.init.credentials, "same-origin");
  respond = () => { throw new TypeError("fetch failed"); };
  const n = await getJson("/x").catch(err => err);
  assert.equal(n.status, 0); assert.equal(n.code, "network");
  respond = () => new Response(null, { status: 204 });
  assert.equal(await sendJson("/x", "POST", { a: 1 }), null);
  assert.equal(calls.at(-1)!.init.method, "POST"); assert.equal(calls.at(-1)!.init.body, '{"a":1}');
  assert.equal((calls.at(-1)!.init.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.deepEqual(await guestEmpty(() => Promise.reject(new ApiError(401, null, "/x")), []), []);
  await assert.rejects(guestEmpty(() => Promise.reject(new ApiError(500, null, "/x")), []));
  assert.ok(isUnauthorized(new ApiError(401, null, "")));
}

/* apiSource: 401 → 게스트(빈 목록), 5xx → 던짐 */
{
  respond = () => json(401, { detail: "authentication required" });
  assert.deepEqual(await apiSource.watchlist(), { symbols: [], updatedAt: null });
  assert.deepEqual(await apiSource.recent(), { items: [] });
  await apiSource.addRecent("NVDA");   // 조용히 넘긴다
  await assert.rejects(apiSource.setWatchlist(["NVDA"]), (e: unknown) => isUnauthorized(e));
  respond = () => json(503, { detail: { code: "recent_symbols_unavailable" } });
  await assert.rejects(apiSource.recent(), (e: unknown) => e instanceof ApiError && e.code === "recent_symbols_unavailable");
  await assert.rejects(apiSource.news({}), (e: unknown) => e instanceof ApiError && e.status === 503);

  respond = (url, init) => {
    if (url.startsWith("/api/charts/watchlist") && init.method === "PUT") return json(200, { persisted: true, symbols: JSON.parse(String(init.body)).symbols.map((symbol: string) => ({ symbol })) });
    if (url.startsWith("/api/me/recent-symbols") && init.method === "POST") return new Response(null, { status: 204 });
    if (url.startsWith("/api/market/heatmap")) return json(200, HEATMAP);
    if (url.startsWith("/api/market/symbols/search")) return json(200, { symbols: [] });
    if (url.startsWith("/api/market/news/latest")) return json(200, { items: [
      { articleId: "old", titleKo: "옛 기사", publishedAt: "2026-10-30T08:00:00Z", isHot: false },
      { articleId: "hot", titleKo: "급등 기사", publishedAt: "2026-10-30T07:00:00Z", isHot: true },
      { articleId: "new", titleKo: "새 기사", publishedAt: "2026-10-30T09:00:00Z", isHot: false },
    ] });
    if (url.startsWith("/api/news/")) return json(200, { id: "hot", titleKo: "급등 기사", bodyKo: ["a"], relatedSymbols: [] });
    return json(500, null);
  };
  assert.deepEqual((await apiSource.setWatchlist(["NVDA", "AMD"])).symbols, ["NVDA", "AMD"]);
  assert.equal(JSON.parse(String(calls.at(-1)!.init.body)).symbols.length, 2);
  await apiSource.addRecent("NVDA");
  assert.deepEqual(JSON.parse(String(calls.at(-1)!.init.body)), { symbol: "NVDA" });
  assert.deepEqual((await apiSource.news({ sort: "hot", limit: 2 })).items.map(i => i.id), ["hot", "new"]);
  assert.deepEqual((await apiSource.news({ sort: "new" })).items.map(i => i.id), ["new", "old", "hot"]);
  assert.deepEqual((await apiSource.article("hot")).bodyKo, ["a"]);
  assert.match(calls.at(-1)!.url, /^\/api\/news\/hot$/);
  /* 한글 검색은 heatmap 한글명으로 찾는다 */
  assert.deepEqual((await apiSource.symbolSearch("엔비디아")).items.map(i => i.symbol), ["NVDA"]);
  assert.deepEqual(await apiSource.symbolSearch("  "), { items: [] });
  assert.equal((await apiSource.heatmap()).items.length, 2);
  assert.equal((await apiSource.symbols()).items.length, 3);
}
