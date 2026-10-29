/* 브라우저 저장소 래퍼. 목업 gops.js 96~99줄의 store 와 같고, gops.* 키마다 타입 있는 헬퍼를 둔다.
   값이 null 이면 지운다. localStorage 가 막힌 환경에서는 조용히 실패한다. */

export const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null | undefined): void { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* 저장 못 해도 화면은 돈다 */ } },
};

/* 목업이 쓰는 키 전부. 새 키를 더하면 여기와 계약 D34(화면 설정 동기화)를 같이 본다 */
export const KEYS = {
  cur: "gops.cur",         // 통화: "usd" 만 저장, 원화는 지움
  exp: "gops.exp",         // 투자 경험 new|some|pro
  ai: "gops.ai",           // AI 대화 상태 new|loading|1 (loading 은 다시 열 때 1 로 읽는다)
  dw: "gops.dw",           // 펼친 오른쪽 탭 ai|watch|hold|recent|learn
  dwLast: "gops.dw.last",  // 마지막으로 펼쳤던 탭 (접었다 펼 때)
  dwW: "gops.dw.w",        // 드로어 너비 px
  brand: "gops.brand",     // 대표색 후보 이름
  guest: "gops.guest",     // 로그아웃 상태 "1"
  course: "gops.course",   // 맞힌 문제 id, 쉼표로
  tour: "gops.tour",       // 홈 둘러보기 끝냈는지 "1"
  layout: "gops.layout",   // 종목 화면 패널 배치 JSON
  sideW: "gops.side.w",    // 종목 화면 오른쪽 사이드바 너비 px
  chart: "gops.chart",     // 차트 설정 JSON (iv, type, ma, ...)
  draw: "gops.draw",       // 그린 선 JSON (종목별)
} as const;

export type Experience = "new" | "some" | "pro";
export const DW_TABS = ["ai", "watch", "hold", "recent", "learn"] as const;
export type DwTab = typeof DW_TABS[number];
export const isDwTab = (v: string | null | undefined): v is DwTab => DW_TABS.includes(v as DwTab);

export const prefs = {
  cur: { get: (): "usd" | null => (store.get(KEYS.cur) === "usd" ? "usd" : null), set: (v: string | null) => store.set(KEYS.cur, v || null) },
  exp: { get: (): Experience | null => { const v = store.get(KEYS.exp); return v === "new" || v === "some" || v === "pro" ? v : null; }, set: (v: Experience | null) => store.set(KEYS.exp, v) },
  /* 목업 AI_STATE 초기값: 저장된 값이 loading 이면 답변이 있는 상태(1)로 읽는다 */
  ai: { get: (): string | null => { const v = store.get(KEYS.ai); return v === "loading" ? "1" : v; }, set: (v: string | null) => store.set(KEYS.ai, v) },
  dw: { get: (): DwTab | null => { const v = store.get(KEYS.dw); return isDwTab(v) ? v : null; }, set: (v: DwTab | null) => store.set(KEYS.dw, v) },
  dwLast: { get: (): DwTab | null => { const v = store.get(KEYS.dwLast); return isDwTab(v) ? v : null; }, set: (v: DwTab | null) => store.set(KEYS.dwLast, v) },
  dwW: { get: (): number => { const n = Number(store.get(KEYS.dwW)); return n > 0 ? n : 0; }, set: (px: number) => store.set(KEYS.dwW, String(Math.round(px))) },
  brand: { get: (): string | null => store.get(KEYS.brand), set: (v: string | null) => store.set(KEYS.brand, v) },
  guest: { get: (): boolean => store.get(KEYS.guest) === "1", set: (on: boolean) => store.set(KEYS.guest, on ? "1" : null) },
  course: { get: (): Set<string> => new Set((store.get(KEYS.course) || "").split(",").filter(Boolean)), set: (ids: Iterable<string>) => store.set(KEYS.course, [...ids].join(",") || null) },
  tour: { get: (): boolean => store.get(KEYS.tour) === "1", set: (done: boolean) => store.set(KEYS.tour, done ? "1" : null) },
  sideW: { get: (): number => { const n = Number(store.get(KEYS.sideW)); return n > 0 ? n : 0; }, set: (px: number) => store.set(KEYS.sideW, String(Math.round(px))) },
  json<T>(key: typeof KEYS.layout | typeof KEYS.chart | typeof KEYS.draw) {
    return {
      get: (): T | null => { try { return JSON.parse(store.get(key) || "null") as T | null; } catch { return null; } },
      set: (v: T | null) => store.set(key, v == null ? null : JSON.stringify(v)),
    };
  },
};
