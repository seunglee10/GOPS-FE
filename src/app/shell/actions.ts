/* 목업 gops.js 3326~3454줄의 data-act 이벤트 위임을 훅 하나로. 컴포넌트는 여기 있는 함수를 onClick 에 건다.
   로그아웃 상태에서 NEED 목록의 행동은 로그인 안내 대화상자로 보낸다 (3332~3333줄) */
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQ } from "../query";
import { useSession } from "../session";
import { prefs, type DwTab } from "../store";
import { useToast } from "./ToastProvider";
import { useWatchlist } from "../../data/hooks/useWatchlist";
import { useSymbolMap } from "./useSymbolMap";
import { PATH, type PageKey } from "../nav";
import { useAuth } from "../../auth/AuthProvider";
import { dataSourceKind } from "../../data/source";

export const NEED = ["oi-submit", "alert-save", "order", "rule", "rule-res", "star", "send", "pick", "example", "toggle-rule", "guard", "unwatch", "submit-order", "submit-rule", "ask-level", "open-ai"] as const;
export type NeedAction = typeof NEED[number];

/* 로그인 뒤 돌아올 주소: 지금 주소에서 guest, dialog 를 뺀 것 */
export function backHref(): string {
  const p = new URLSearchParams(window.location.search); p.delete("guest"); p.delete("dialog");
  const s = p.toString();
  return window.location.pathname + (s ? "?" + s : "");
}

export function useActions(page: PageKey) {
  const { q, setQ, dw, ag } = useQ();
  const { guest } = useSession();
  const { toast, toasts, clear } = useToast();
  const navigate = useNavigate();
  const watch = useWatchlist();
  const syms = useSymbolMap();
  const auth = useAuth();

  /* 로그인이 필요한 행동은 먼저 막는다. 막혔으면 true */
  const requireLogin = useCallback((action: NeedAction | string): boolean => {
    if (guest && (NEED as readonly string[]).includes(action)) { setQ({ dialog: "need-login", pop: null, sheet: null }); return true; }
    return false;
  }, [guest, setQ]);

  /* 목업 starSet(): ?star= 가 있으면 그 목록, 없으면 관심 종목 */
  const starSet = useCallback((): Set<string> => {
    if (guest) return new Set();
    const v = q("star");
    return new Set(v == null ? (watch.data?.symbols ?? []) : v.split(",").filter(Boolean));
  }, [guest, q, watch.data]);

  const go = useCallback((href: string) => navigate(href), [navigate]);

  return useMemo(() => ({
    q, setQ, dw, ag, go, requireLogin, starSet, guest,
    /* data-act="set": 쿼리 하나 바꾸기 (+ data-extra 로 같이 바꿀 키) */
    set(k: string, v: string | number | null, extra?: Record<string, string | null>) {
      const patch: Record<string, string | number | null> = { [k]: v, ...(extra || {}) };
      if (k === "dialog") patch.menu = null;
      setQ(patch);
    },
    me() { setQ({ me: q("me") ? null : "1", bell: null }); },
    bell() { setQ({ bell: q("bell") ? null : "1" }); },
    menu(id: string) { setQ({ menu: q("menu") === id ? null : id }); },
    /* 목업 3339줄: gops.guest 를 켜고 홈으로. api 모드는 POST /api/auth/logout 으로 세션을 끝낸다 (D40) */
    logout() {
      prefs.dw.set(null);
      if (dataSourceKind() === "api") { void auth.logout().then(() => window.location.assign(PATH.home)); return; }
      prefs.guest.set(true); window.location.assign(PATH.home);
    },
    thread() { setQ({ dw: dw() === "ai" ? null : "ai", agent: ag() || "1" }); },
    rail(tab: DwTab) { setQ(dw() === tab ? { dw: null } : (tab === "ai" ? { dw: "ai", agent: ag() || "1" } : { dw: tab })); },
    railFold() { setQ({ dw: dw() ? null : (prefs.dwLast.get() || "watch") }); },
    openAi() { if (requireLogin("open-ai")) return; setQ({ dw: "ai", agent: ag() || "1" }); },
    newThread() { setQ({ agent: "new", hl: null, done: null }); },
    askLevel() { if (requireLogin("ask-level")) return; setQ({ pop: null, agent: "1" }); },
    focusSearch() { (document.getElementById("hsearchinput") as HTMLInputElement | null)?.focus(); },
    /* 답변의 근거 버튼: 종목 화면이 아니면 NVDA 화면으로 옮긴다 */
    ref(r: "news" | "chart" | "fin") {
      if (page !== "stock") go(`/stock?s=NVDA&agent=1&${r === "chart" ? "hl=1" : r === "news" ? "tab=news" : "tab=company"}`);
      else setQ(r === "chart" ? { hl: "1", tab: null } : { tab: r === "news" ? "news" : "company" });
    },
    rule(d: { s: string; price?: string | number | null; dir?: string | null; from?: string | null }) {
      if (requireLogin("rule")) return;
      setQ({ sheet: "rule", rs: d.s, price: d.price || null, dir: d.dir || null, from: d.from || null, act: null, pop: null });
    },
    order(d: { s: string; price?: string | number | null; side?: "buy" | "sell" | null }) {
      if (requireLogin("order")) return;
      setQ({ sheet: "order", rs: d.s, price: d.price || null, side: d.side || "buy", qty: null, pop: null });
    },
    closeSheet() {
      if (q("sheet") === "order" && q("qty") && q("qty") !== "10") { setQ({ dialog: "leave" }); return; }
      setQ({ sheet: null, rs: null, price: null, side: null, qty: null, dir: null, from: null, act: null });
    },
    discard() { setQ({ dialog: null, sheet: null, rs: null, price: null, side: null, qty: null }); },
    closeDialog() { setQ({ dialog: null, step: null, welcome: null, id: null }); },
    confirmDelete() { setQ({ dialog: null, id: null }); toast("규칙을 삭제했어요."); },
    exp(v: "new" | "some" | "pro") { prefs.exp.set(v); },
    saveProfile() {
      setQ({ dialog: null, step: null, welcome: null, signup: null });
      if (prefs.exp.get() === "new") toast("'차트 읽기 첫걸음' 코스는 프로필 메뉴에서 언제든 열 수 있어요.", { action: "바로 시작", href: "/course" });
    },
    toggleRule(id: string, rule: { symbol: string; condKo: string; enabled: boolean }) {
      if (requireLogin("toggle-rule")) return;
      const off = new Set((q("off") || "").split(",").filter(Boolean)), wasOn = rule.enabled && !off.has(id);
      if (!rule.enabled) { toast("꺼진 규칙은 편집에서 조건을 확인한 뒤 켤 수 있어요."); return; }
      if (wasOn) off.add(id); else off.delete(id);
      setQ({ off: [...off].join(",") || null });
      if (wasOn) toast(`${rule.symbol} ${rule.condKo} 규칙을 껐어요.`, { action: "실행 취소", undo: () => { off.delete(id); setQ({ off: [...off].join(",") || null }); } });
    },
    guard(k: string, on: boolean) { if (requireLogin("guard")) return; setQ({ [k]: on ? "0" : "1" }); toast("가드레일을 저장했어요. 다음 주문부터 적용돼요."); },
    star(s: string) {
      if (requireLogin("star")) return;
      const st = starSet(), had = st.has(s); if (had) st.delete(s); else st.add(s);
      setQ({ star: [...st].join(",") });
      const ko = syms[s]?.nameKo; const kr = !syms[s] && ko;
      const nm = kr ? ko + (/[가-힣]/.test(ko.slice(-1)) && (ko.slice(-1).charCodeAt(0) - 0xac00) % 28 ? "을" : "를") : s + "를";
      toast(had ? `${nm} 관심 종목에서 뺐어요.` : `${nm} 관심 종목에 추가했어요.`, { action: "실행 취소", undo: () => { if (had) st.add(s); else st.delete(s); setQ({ star: [...st].join(",") }); } });
    },
    unwatch(s: string) { if (requireLogin("unwatch")) return; toast(`${s}를 관심 종목에서 뺐어요.`, { action: "실행 취소" }); },
    toastClose() { clear(); setQ({ toast: null }); },
    toastAct() {
      const t = toasts[0]; clear();
      if (t && t.undo) t.undo();
      else if (q("toast") === "ruleoff") setQ({ toast: null, off: null });
      else if ((t && t.error) || q("toast") === "error") { setQ({ toast: null }); toast("다시 보냈어요. 체결을 기다리는 중이에요."); }
      else setQ({ toast: null });
    },
    toast,
  }), [q, setQ, go, requireLogin, starSet, guest, dw, ag, page, toast, toasts, clear, syms, auth]);
}
export type Actions = ReturnType<typeof useActions>;
