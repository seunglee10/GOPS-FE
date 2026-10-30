/* 백엔드 응답(JSON) → src/api/types.ts 모양. 서버 필드 이름은 GOPS-BE 라우트 코드 기준:
   heatmap      app/market_data/heatmap/service.py compact_heatmap_payload
   검색         app/market_data/query/service.py symbol_search  → { symbols: [{ symbol, name, exchange, nameKo, exchangeKo }] }
   많이 찾는    market_data/serving/hot_symbols.py              → { symbols: [{ rank, symbol, name, lastPrice, changePercent }] }
   관심 종목    app/services/alfaka_market_data.py               → { persisted, symbols: [{ symbol, name, lastPrice, changePercent }] }
   최근 본      app/me/routes.py                                 → { items: [{ symbol, nameKo, viewedAt }] }
   뉴스 목록    app/market_data/query/service.py normalize_news_item (id 는 articleId)
   뉴스 본문    app/news/routes.py                               → { id, ..., bodyKo: [] }
   부수 효과 없는 순수 함수만 둔다 (tests/apiMappers.test.ts) */
import type * as T from "../../api/types";
import { asString, readArray, readObject } from "../../shared/json";

const obj = (v: unknown) => readObject(v) ?? {};
/** 숫자로 읽을 수 있으면 숫자, 아니면 null (null·"" 를 0 으로 바꾸지 않는다) */
export function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
}
const sym = (v: unknown) => (asString(v) ?? "").toUpperCase();

/* ---------- D2 섹터·트리맵, D1 종목 마스터 ---------- */
export function mapHeatmap(raw: unknown): T.HeatmapPayload {
  const r = obj(raw);
  const items: T.HeatmapItem[] = [];
  for (const x of readArray(r.items).map(obj)) {
    const symbol = sym(x.symbol); if (!symbol) continue;
    const cap = num(x.marketCap) ?? num(x.layoutMarketCap);
    if (cap == null || cap <= 0) continue;   // 크기를 정할 수 없는 칸은 그리지 않는다
    items.push({ symbol, nameKo: asString(x.nameKo) ?? null, sectorLabelKo: asString(x.sectorLabelKo) ?? asString(x.sector) ?? "기타",
      marketCap: cap, changePercent: num(x.changePercent) ?? 0, changePercent1w: null, changePercent1m: null });
  }
  return { universe: asString(r.universe) ?? "sp500", generatedAt: asString(r.generatedAt) ?? "", items };
}

/** 종목 마스터는 따로 받지 않고 heatmap 응답(S&P 500 전체, 한글명·섹터·현재가 포함)에서 만든다 */
export function symbolsFromHeatmap(raw: unknown): T.SymbolsPayload {
  const items: T.SymbolInfo[] = [];
  for (const x of readArray(obj(raw).items).map(obj)) {
    const symbol = sym(x.symbol); if (!symbol) continue;
    items.push({ symbol, companyName: asString(x.companyName) ?? symbol, nameKo: asString(x.nameKo) ?? null, exchange: asString(x.exchange) ?? "",
      exchangeKo: asString(x.exchangeKo) ?? null, sector: asString(x.sector) ?? null, sectorLabelKo: asString(x.sectorLabelKo) ?? null,
      price: num(x.lastPrice) ?? 0, changePercent: num(x.changePercent) ?? 0, marketCap: num(x.marketCap) ?? num(x.layoutMarketCap) });
  }
  return { items };
}

/* ---------- D19 검색·많이 찾는 종목 ---------- */
type Lookup = (symbol: string) => T.SymbolInfo | undefined;
function searchItem(x: Record<string, unknown>, lookup: Lookup): T.SymbolSearchItem | null {
  const symbol = sym(x.symbol); if (!symbol) return null;
  const m = lookup(symbol);
  const nm = asString(x.name) ?? asString(x.companyName);   // 시세가 없는 종목은 서버가 name 에 티커를 그대로 넣는다
  return { symbol, nameKo: asString(x.nameKo) ?? m?.nameKo ?? null, companyName: (nm && nm !== symbol ? nm : undefined) ?? m?.companyName ?? nm ?? symbol,
    exchangeKo: asString(x.exchangeKo) ?? m?.exchangeKo ?? null,
    price: num(x.lastPrice) ?? num(x.price) ?? m?.price ?? 0, changePercent: num(x.changePercent) ?? m?.changePercent ?? 0 };
}
const searchList = (raw: unknown, lookup: Lookup) => {
  const r = obj(raw); const list = Array.isArray(r.symbols) ? r.symbols : readArray(r.items);
  return list.map(obj).map(x => searchItem(x, lookup)).filter((x): x is T.SymbolSearchItem => x != null);
};
export function mapSymbolSearch(raw: unknown, lookup: Lookup = () => undefined): T.SymbolSearchPayload { return { items: searchList(raw, lookup) }; }
/** 시세가 하나도 없을 때 서버는 유니버스 앞쪽 종목을 rankReason "no_data_fallback" 으로 채운다. 많이 찾는 종목이 아니니 뺀다 */
export function mapHotSymbols(raw: unknown, lookup: Lookup = () => undefined): T.HotSymbolsPayload {
  const r = obj(raw);
  const real = readArray(r.symbols ?? r.items).filter(x => obj(x).rankReason !== "no_data_fallback");
  return { items: searchList({ symbols: real }, lookup) };
}

/** 서버 검색은 티커·영문명만 본다. 한글로 찾으면 종목 마스터의 한글명에서 더 찾아 서버 결과 뒤에 붙인다 */
export function mergeKoreanMatches(server: T.SymbolSearchItem[], text: string, master: T.SymbolInfo[], limit: number): T.SymbolSearchItem[] {
  const q = text.trim(); const out = [...server];
  if (/[가-힣]/.test(q)) {
    for (const s of master) {
      if (out.length >= limit) break;
      if (s.nameKo?.includes(q) && !out.some(o => o.symbol === s.symbol))
        out.push({ symbol: s.symbol, nameKo: s.nameKo, companyName: s.companyName, exchangeKo: s.exchangeKo, price: s.price, changePercent: s.changePercent });
    }
  }
  return out.slice(0, limit);
}

/* ---------- D17 관심 종목 ---------- */
/** persisted:false 는 아직 저장한 적이 없어서 서버가 기본 목록을 채운 것이다. 사용자가 고른 게 아니니 비어 있는 것으로 본다 */
export function mapWatchlist(raw: unknown): T.WatchlistPayload {
  const r = obj(raw);
  if (r.persisted === false) return { symbols: [], updatedAt: null };
  const symbols = readArray(r.symbols).map(s => sym(typeof s === "string" ? s : obj(s).symbol)).filter(Boolean);
  return { symbols: [...new Set(symbols)], updatedAt: asString(r.updatedAt) ?? null };
}

/* ---------- D18 최근 본 종목 ---------- */
export function mapRecent(raw: unknown): T.RecentSymbolsPayload {
  const items: T.RecentSymbol[] = [];
  for (const x of readArray(obj(raw).items).map(obj)) {
    const symbol = sym(x.symbol); const viewedAt = asString(x.viewedAt);
    if (symbol && viewedAt) items.push({ symbol, nameKo: asString(x.nameKo) ?? null, viewedAt });
  }
  return { items };
}

/** 최근 본 종목을 오늘·어제·그 전으로 나눈다. 날짜는 보는 사람의 현지 날짜 기준 */
export function groupRecentByDay(items: T.RecentSymbol[], now: Date): { today: T.RecentSymbol[]; yesterday: T.RecentSymbol[]; earlier: T.RecentSymbol[] } {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const t0 = day(now), y0 = t0 - 86_400_000;
  const out = { today: [] as T.RecentSymbol[], yesterday: [] as T.RecentSymbol[], earlier: [] as T.RecentSymbol[] };
  for (const it of items) {
    const ms = Date.parse(it.viewedAt); if (Number.isNaN(ms)) continue;
    const d = day(new Date(ms));
    (d >= t0 ? out.today : d >= y0 ? out.yesterday : out.earlier).push(it);
  }
  return out;
}

/* ---------- D13 뉴스 ---------- */
const NEWS_CATEGORIES: readonly T.NewsCategory[] = ["market", "corp", "earn", "rate", "etf", "global"];
const category = (v: unknown): T.NewsCategory => (NEWS_CATEGORIES as readonly string[]).includes(v as string) ? v as T.NewsCategory : "corp";

/** "방금", "12분 전", "3시간 전", "2일 전", 일주일이 넘으면 "10월 2일" */
export function relativeKo(iso: string, now: Date): string {
  const ms = Date.parse(iso); if (Number.isNaN(ms)) return "";
  const min = Math.floor((now.getTime() - ms) / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.floor(min / 1440)}일 전`;
  const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function related(v: unknown): T.NewsSymbolRef[] {
  const out: T.NewsSymbolRef[] = [];
  for (const x of readArray(v).map(obj)) { const s = sym(x.symbol); if (s && !out.some(o => o.symbol === s)) out.push({ symbol: s, nameKo: asString(x.nameKo) ?? null }); }
  return out;
}
function newsItem(x: Record<string, unknown>, now: Date): T.NewsItem | null {
  const id = asString(x.articleId) ?? asString(x.id);
  const titleKo = asString(x.titleKo) ?? asString(x.title);
  if (!id || !titleKo) return null;   // id 가 없으면 본문을 열 수 없어서 목록에서 뺀다
  const publishedAt = asString(x.publishedAt) ?? "";
  return { id, titleKo, source: asString(x.source) ?? "", publishedAt, relativeKo: relativeKo(publishedAt, now), category: category(x.category),
    relatedSymbols: related(x.relatedSymbols), isHot: x.isHot === true, url: asString(x.url) ?? null };
}

export function mapNewsList(raw: unknown, now: Date): T.NewsListPayload {
  const seen = new Set<string>(); const items: T.NewsItem[] = [];
  for (const x of readArray(obj(raw).items).map(obj)) { const n = newsItem(x, now); if (n && !seen.has(n.id)) { seen.add(n.id); items.push(n); } }
  return { items };
}

/** sort=new 는 최신순, sort=hot 은 isHot 먼저(그 안에서 최신순). 서버에 정렬 파라미터가 없어서 여기서 줄 세운다 */
export function sortNews(items: T.NewsItem[], sort: T.NewsQuery["sort"] = "new"): T.NewsItem[] {
  const t = (n: T.NewsItem) => Date.parse(n.publishedAt) || 0;
  return [...items].sort((a, b) => (sort === "hot" ? Number(b.isHot) - Number(a.isHot) : 0) || t(b) - t(a));
}

export function mapArticle(raw: unknown, now: Date): T.NewsArticle | null {
  const x = obj(raw); const n = newsItem(x, now); if (!n) return null;
  const bodyKo = readArray(x.bodyKo).map(p => asString(p)).filter((p): p is string => !!p);
  return { ...n, bodyKo };
}

/** GET /api/market/news/latest 쿼리. limit 은 서버 상한 30, symbols 는 20개까지 */
export function newsLatestUrl(q: T.NewsQuery): string {
  const p = new URLSearchParams();
  if (q.category) p.set("category", q.category);
  const syms = [...new Set((q.symbols ?? []).map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 20);
  if (syms.length) p.set("symbols", syms.join(","));
  p.set("limit", String(Math.min(30, Math.max(1, q.sort === "hot" ? 30 : q.limit ?? 30))));
  return `/api/market/news/latest?${p}`;
}
