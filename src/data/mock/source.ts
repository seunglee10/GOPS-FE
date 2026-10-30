/* 목업 데이터로 DataSource 를 구현한다. 응답은 바로 resolve 되고, 주문·규칙·AI 답변처럼 목업이 setTimeout 으로 흉내 내던 것은 같은 시간만 기다린다.
   관심 종목·코스 진행·투자 경험은 목업처럼 이 브라우저(localStorage)에만 남는다. */
import type * as T from "../../api/types";
import type { DataSource } from "../source";
import { prefs } from "../../app/store";
import { S, SECTORS, KR_S, FX, CASH, TRADE, WHY, CHART, MKT, MKT_SESSIONS, ST, capB, tradeB, VOL, sectorOf } from "./symbols";
import { candlesOf, cxSeries, levelsOf, volX, prevClose, swingOf } from "./candles";
import { HOLD, RULES, ORDERS, ACCOUNT, ACTIVITY, HOLD_SECTOR, performanceSeries, WEIGHT_BASE } from "./portfolio";
import { NEWS, NEWS_CAT, NEWS_STAT, newsId, newsIndex } from "./news";
import { CAL_EV, CAL_AI, CAL_Y, CAL_M, CAL_TODAY, HOME_NEXT_EVENTS } from "./calendar";
import { COURSE, COURSE_ID, COURSE_TITLE, DAYS } from "./course";
import { COURSE_CHARTS } from "./courseCharts";
import { T as TRADES, AUG, MONTH, H, HABIT_NAME, GUARDRAILS, reviewKpi } from "./coach";
import { factsOf, PEERS, chartEventsOf, upcomingOf, earnDateOf, AI_TODAY } from "./facts";
import { aiSummary, fixedAnswer, ANSWER_DELAY_MS, FIXED_THREAD, FIXED_THREAD_TITLE } from "./ai";
import { DEMO_USER, WATCH, RECENT, RECENT_SEARCHES, HOT_SYMBOLS, BELL_ITEMS, RECOMMENDED } from "./user";
import { liveStoreOf } from "./live";
import { investorFlowsOf, fundamentalsOf, compareOf, volumeSharesOf } from "./stockExtra";
import { mapChg } from "./candles";

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const NOW = "2026-09-30T20:00:00Z";
const ko = (k: string) => (S[k] || KR_S[k])?.ko ?? null;
const info = (k: string): T.SymbolInfo => {
  const v = S[k]; const [sec] = sectorOf(k);
  return { symbol: k, companyName: v.ko, nameKo: v.ko, exchange: v.ex === "나스닥" ? "NASDAQ" : "NYSE", exchangeKo: v.ex, sector: null, sectorLabelKo: sec === "시장" ? null : sec, price: v.p, changePercent: v.d, marketCap: v.cap * 1e9, color: v.c };
};
const searchItem = (k: string): T.SymbolSearchItem => ({ symbol: k, nameKo: S[k].ko, companyName: S[k].ko, exchangeKo: S[k].ex, price: S[k].p, changePercent: S[k].d });
const d2 = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* 브라우저에만 남는 상태 (목업 ?star=, ?off=, gops.course 와 같은 역할) */
let watch = new Set<string>(WATCH);
let recent = [...RECENT];
let rules: T.Rule[] = RULES.map(r => ({ ...r }));
let notifications = BELL_ITEMS.map(n => ({ ...n }));
let guardrails: T.Guardrails = { ...GUARDRAILS };
let askTimer: ReturnType<typeof setTimeout> | null = null;
let askReject: ((e: Error) => void) | null = null;

export const mockSource: DataSource = {
  kind: "mock",

  async symbols() { return { items: Object.keys(S).map(info) }; },
  async heatmap() {
    return { universe: "sp500", generatedAt: NOW, items: SECTORS.flatMap(([name, t]) => t.map(([symbol, cap, d]) => ({ symbol, nameKo: ko(symbol), sectorLabelKo: name, marketCap: cap * 1e9, changePercent: d, changePercent1w: mapChg(symbol, d, "1w"), changePercent1m: mapChg(symbol, d, "1m") }))) };
  },
  async indices() {
    const names: Record<string, string> = { "코스피": "^KS11", "코스닥": "^KQ11", "달러 환율": "KRW=X", "VIX": "^VIX", "나스닥 100 선물": "NQ=F", "나스닥": "^IXIC", "S&P 500": "^GSPC", "필라델피아 반도체": "^SOX" };
    return { updatedAt: NOW, items: MKT.flat().map(([n, v, d, p, why, shape, flag]) => ({ symbol: names[n] || n, nameKo: n, value: Number(v.replace(/,/g, "")), change: d, changePercent: p, sparkline: [], why: why || null, flag: flag || shape || null })) };
  },
  async marketClock() { return { status: "closed", nextOpenAt: null, sessions: MKT_SESSIONS.map(s => ({ ...s, isOpen: true })) }; },
  async movers({ sort, market = "", limit }) {
    const pool = (market === "kr" ? [] : Object.keys(S)).concat(market === "us" ? [] : Object.keys(KR_S));
    const byTrade = (list: string[]) => [...list].sort((a, b) => (tradeB(b) || 0) - (tradeB(a) || 0));
    const rows = { trade: byTrade(pool), volume: [...pool].sort((a, b) => VOL(b) - VOL(a)),
      up: pool.filter(k => ST(k)!.d > 0).sort((a, b) => ST(b)!.d - ST(a)!.d), down: pool.filter(k => ST(k)!.d < 0).sort((a, b) => ST(a)!.d - ST(b)!.d) }[sort];
    const items: T.MoverItem[] = rows.slice(0, limit ?? rows.length).map(k => ({
      symbol: k, nameKo: ko(k), price: ST(k)!.p, changePercent: ST(k)!.d, currency: KR_S[k] ? "KRW" : "USD", color: ST(k)!.c,
      dollarVolume: tradeB(k) != null ? tradeB(k)! * 1e9 : null, volume: TRADE[k] || KR_S[k] ? VOL(k) : null, marketCap: capB(k) * 1e9,
      volumeRatio20d: S[k] ? volX(k) : null, issue: WHY[k]?.[0] ?? null, issueSource: WHY[k]?.[1] ?? null, issueNewsId: null, chartNote: CHART[k] ?? null }));
    return { asOf: NOW, items };
  },
  async fx() { return { pair: "USDKRW", rate: FX, asOf: NOW, source: "mock" }; },

  async candles(symbol, iv) { return iv === "D" && !S[symbol] ? [] : cxSeries(symbol, iv); },
  live(symbol) { const st = liveStoreOf(symbol); return { snapshot: () => st.snapshot(), subscribe: l => st.subscribe(l) }; },
  async stockSummary(symbol) {
    const st = S[symbol], F = factsOf(symbol), C = candlesOf(symbol), last = C[C.length - 1], [sec] = sectorOf(symbol);
    const all = SECTORS.flatMap(([, t]) => t).sort((a, b) => b[1] - a[1]), rank = all.findIndex(t => t[0] === symbol);
    return { symbol, nameKo: st.ko, exchangeKo: st.ex, price: st.p, change: st.p - prevClose(symbol), changePercent: st.d, marketCap: st.cap * 1e9, marketCapRank: rank >= 0 ? rank + 1 : null,
      per: F.per, sectorPer: F.sper, sectorLabelKo: sec === "시장" ? null : sec, low52: F.lo, high52: F.hi, dayLow: last.l, dayHigh: last.h,
      volume: volumeSharesOf(symbol), avgVolume20d: volumeSharesOf(symbol) / F.x, volumeRatio20d: F.x, dollarVolume: (TRADE[symbol] || st.cap / 300) * 1e9,
      peers: Object.entries(PEERS).filter(([k]) => k !== symbol).map(([k, per]) => ({ symbol: k, nameKo: ko(k), per })), asOf: NOW };
  },
  async fundamentals(symbol, period = "quarterly") { return fundamentalsOf(symbol, period); },
  async levels(symbol) { return { ...levelsOf(symbol), target: null, stop: null }; },
  async chartEvents(symbol) { return { symbol, events: chartEventsOf(symbol), upcoming: upcomingOf(symbol), nextEarningsAt: earnDateOf(symbol), asOf: new Date(AI_TODAY) }; },

  async news(query) {
    let idx = NEWS.map((_, i) => i);
    if (query.category) idx = idx.filter(i => NEWS_CAT[i] === query.category);
    if (query.symbols?.length) idx = idx.filter(i => NEWS[i][4].some(s => query.symbols!.includes(s)));
    idx.sort((a, b) => query.sort === "hot" ? NEWS_STAT[b][1] - NEWS_STAT[a][1] : NEWS_STAT[a][0] - NEWS_STAT[b][0]);
    const items = idx.slice(0, query.limit ?? idx.length).map(i => toNews(i));
    return { items };
  },
  async article(id) { const i = newsIndex(id); if (i < 0 || !NEWS[i]) throw new Error("뉴스를 찾지 못했어요"); return { ...toNews(i), bodyKo: NEWS[i][5] || [] }; },
  async aiSummary(symbol) { return aiSummary(symbol); },
  async marketBrief() { return { marketDate: "2026-09-30", generatedAt: NOW, paragraphs: [{ text: CAL_AI, refs: [] }] }; },
  agent: {
    ask(question, ctx) {
      if (askTimer) clearTimeout(askTimer);
      return new Promise<T.AgentView>((resolve, reject) => {
        askReject = reject;
        askTimer = setTimeout(() => { askTimer = null; askReject = null; resolve(fixedAnswer(question, ctx)); }, ANSWER_DELAY_MS);
      });
    },
    stop() { if (askTimer) { clearTimeout(askTimer); askTimer = null; } if (askReject) { askReject(new Error("stopped")); askReject = null; } },
    async threads() { return { items: [{ threadId: "t1", title: FIXED_THREAD_TITLE, symbol: "NVDA", updatedAt: NOW }] }; },
    async thread() { return { threadId: "t1", title: FIXED_THREAD_TITLE, symbol: "NVDA", updatedAt: NOW, messages: FIXED_THREAD }; },
  },

  async watchlist() { return { symbols: [...watch], updatedAt: null }; },
  async setWatchlist(symbols) { watch = new Set(symbols); return { symbols: [...watch], updatedAt: NOW }; },
  async recent() { return { items: recent.map(s => ({ symbol: s, nameKo: ko(s), viewedAt: NOW })) }; },
  async addRecent(symbol) { recent = [symbol, ...recent.filter(s => s !== symbol)].slice(0, 50); },
  async symbolSearch(text) {
    const txt = text.trim(), up = txt.toUpperCase(); if (!txt) return { items: [] };
    return { items: Object.entries(S).filter(([k, v]) => k.startsWith(up) || v.ko.includes(txt)).slice(0, 6).map(([k]) => searchItem(k)) };
  },
  async hotSymbols() { return { items: HOT_SYMBOLS.map(searchItem) }; },

  async account() {
    return { ...ACCOUNT, holdings: HOLD.map(([symbol, qty, avgPrice]) => ({ symbol, nameKo: S[symbol].ko, qty, avgPrice, price: S[symbol].p, changePercent: S[symbol].d, sectorLabelKo: HOLD_SECTOR[symbol] ?? null })) };
  },
  async performance() {
    const { account, benchmark } = performanceSeries();
    const start = new Date(2026, 6, 1);
    return { items: account.map((a, i) => { const d = new Date(start); d.setDate(d.getDate() + Math.round(i * 91 / (account.length - 1))); return { date: d2(d), accountReturnPercent: a, benchmarkReturnPercent: benchmark[i] }; }) };
  },
  async activity(limit) { return { items: ACTIVITY.slice(0, limit ?? ACTIVITY.length) }; },
  async pretrade(req) {
    /* 목업 orderHTML 542~572 의 주문 전 점검과 같은 계산 */
    const st = S[req.symbol] || S.NVDA, price = req.price ?? st.p, held = (HOLD.find(h => h[0] === req.symbol) || [0, 0])[1] as number;
    const max = req.side === "buy" ? Math.floor(CASH / price) : held, qty = req.qty, amt = price * qty;
    const over = !(qty > 0) || qty > max;
    const weight = req.side === "buy" ? ((held + qty) * st.p) / WEIGHT_BASE * 100 : 0;
    const chase = req.side === "buy" && st.d > (guardrails.chaseBuyWarnPercent ?? Infinity);
    const checks: T.PretradeCheck[] = [{ code: "cash", ok: !over, warn: false, text: over ? "주문 가능 범위를 넘었어요" : "주문 가능 금액 안이에요", sub: req.side === "buy" ? `주문 후 현금 $${Math.max(CASH - amt, 0).toFixed(2)}` : `보유 ${held}주` }];
    if (req.side === "buy") {
      checks.push({ code: "position_weight", ok: true, warn: weight > 25, text: `${req.symbol} 비중 ${weight.toFixed(0)}%${weight > 25 ? ", 한도 25%를 넘어요" : ", 한도 25% 안이에요"}`, sub: "코치 가드레일" });
      checks.push({ code: "chase_buy", ok: true, warn: chase, text: chase ? `오늘 +${st.d.toFixed(2)}% 오른 종목이에요` : "추격 매수가 아니에요", sub: chase ? "급등일 추격 매수 경고가 켜져 있어요" : "지지선 근처 지정가 주문" });
    }
    return { checks, maxQty: max, weightPercent: weight };
  },
  async placeOrder(req) { await wait(900); return { orderId: `o_${Date.now()}`, at: "오늘", symbol: req.symbol, side: req.side, type: req.type, qty: req.qty, price: req.price ?? S[req.symbol].p, status: "pending", memo: req.memo }; },
  async orders(query) {
    const all: T.Order[] = ORDERS.map((o, i) => ({ orderId: `o_${i}`, at: o[0], symbol: o[1], side: o[2] === "매수" ? "buy" : "sell", type: o[3] === "지정가" ? "limit" : "market", qty: o[4], price: o[5], status: o[6] === "대기" ? "pending" : o[6] === "체결" ? "filled" : "cancelled", memo: null }));
    const items = !query.status || query.status === "all" ? all : all.filter(o => o.status === query.status);
    const page = query.page ?? 1, size = query.size ?? 20;
    return { items: items.slice((page - 1) * size, page * size), total: items.length, page, size };
  },
  async cancelOrder() { await wait(300); },
  async rules() { return { items: rules.map(r => ({ ...r })) }; },
  async createRule(req) {
    await wait(700);
    const sourceKo = { agent: "에이전트 제안", chart: "차트", user: "직접 만듦", default: "기본 설정" }[req.source];
    const r: T.Rule = { id: `r${rules.length + 1}`, symbol: req.symbol, condKo: `가격이 $${req.price.toFixed(2)} ${req.dir === "above" ? "위로 돌파" : "아래로 하락"}`, actKo: req.action === "order" ? "알림, 10주 매수 예약" : "알림", source: req.source, sourceKo, enabled: true, statusKo: "대기 중" };
    rules = [r, ...rules]; return r;
  },
  async patchRule(id, patch) { const r = rules.find(x => x.id === id); if (!r) throw new Error("규칙을 찾지 못했어요"); Object.assign(r, patch); return { ...r }; },
  async deleteRule(id) { rules = rules.filter(r => r.id !== id); },
  async quickAlert(req) { return { created: req.prices.length }; },
  async notifications() { return { items: notifications.map(n => ({ ...n })), unreadCount: notifications.filter(n => !n.read).length }; },
  async readAllNotifications() { notifications = notifications.map(n => ({ ...n, read: true })); },
  async guardrails() { return { ...guardrails }; },
  async patchGuardrails(patch) { guardrails = { ...guardrails, ...patch }; return { ...guardrails }; },

  async review(month) {
    const k = reviewKpi();
    return { month, kpi: { realizedPnl: k.total, returnPercent: MONTH.acct, winRate: k.winRate, tradeCount: TRADES.length, missedProfit: k.missed, avgWinLossRatio: k.ratio, mistakePnl: k.mistakePnl },
      prevMonth: { realizedPnl: AUG.pnl, winRate: AUG.win, avgWinLossRatio: AUG.ratio, mistakePnl: AUG.mistake, gapPercent: AUG.gap },
      benchmark: { spxReturnPercent: MONTH.spx },
      byHabit: H.map(h => ({ habit: h.key, labelKo: HABIT_NAME.find(([key]) => key === h.key)![1], count: h.n, wins: h.w, pnl: h.pnl, missedProfit: h.missed })),
      trades: TRADES.map(t => ({ ...t })) };
  },
  async saveReviewNote() { await wait(200); },
  async calendar(query) {
    const items: T.CalendarItem[] = CAL_EV.filter(e => (!query.kind || e.k === query.kind) && (!query.region || e.r === query.region)).map((e, i) => ({
      id: `e_${i}`, date: `${CAL_Y}-${String(CAL_M).padStart(2, "0")}-${String(e.d).padStart(2, "0")}`, kind: e.k, region: e.r, title: e.t, level: e.lv ?? null,
      symbol: e.s ?? null, nameKo: e.s ? (S[e.s]?.ko ?? e.s) : null, call: !!e.call, at: e.at ?? null, done: e.done ?? null,
      actual: e.res?.[0] ?? null, forecast: e.res?.[1] ?? null, previous: e.res?.[2] ?? null }));
    return { items, today: `${CAL_Y}-${String(CAL_M).padStart(2, "0")}-${String(CAL_TODAY).padStart(2, "0")}` };
  },
  async calendarBrief(week = "2026-W43") {
    const up = HOME_NEXT_EVENTS.map(t => CAL_EV.find(e => e.t === t)).filter(e => !!e).map(e => ({ date: `${CAL_Y}-${String(CAL_M).padStart(2, "0")}-${String(e!.d).padStart(2, "0")}`, title: e!.t }));
    return { week, text: CAL_AI, upcoming: up };
  },
  async course(courseId) {
    return { courseId, titleKo: COURSE_TITLE, days: Object.entries(DAYS).map(([day, titleKo]) => ({ day: +day, titleKo })), questions: COURSE, charts: COURSE_CHARTS };
  },
  async progress() { return { solved: [...prefs.course.get()], total: COURSE.length }; },
  async postProgress(req) { if (req.correct) { const s = prefs.course.get(); s.add(req.questionId); prefs.course.set(s); } return { solved: [...prefs.course.get()], total: COURSE.length }; },

  async profile() { return { ...DEMO_USER, experience: prefs.exp.get() }; },
  async putProfile(patch) { if ("experience" in patch) prefs.exp.set(patch.experience ?? null); return { ...DEMO_USER, experience: prefs.exp.get() }; },
  async recommendations() { return { generatedAt: NOW, items: RECOMMENDED.map(k => ({ symbol: k, nameKo: ko(k), reason: WHY[k]?.[0] ?? "", score: null })) }; },
  async preferences() { return { version: 1, updatedAt: null, data: { cur: prefs.cur.get(), dwW: prefs.dwW.get() || null, brand: prefs.brand.get() } }; },
  async putPreferences(data) { return { version: 1, updatedAt: NOW, data }; },

  async investorFlows(symbol) { return S[symbol] ? investorFlowsOf(symbol) : null; },
  async compare(symbols) { return compareOf(symbols); },
};
void COURSE_ID; void RECENT_SEARCHES; void swingOf;   // 페이지 작업에서 쓰는 값. 여기서는 노출만 확인

function toNews(i: number): T.NewsItem {
  const [title, source, rel, hot, syms] = NEWS[i];
  return { id: newsId(i), titleKo: title, source, publishedAt: NOW, relativeKo: rel, category: NEWS_CAT[i], relatedSymbols: syms.map(s => ({ symbol: s, nameKo: ko(s) })), isHot: hot, url: null };
}
