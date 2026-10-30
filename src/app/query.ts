/* URL 쿼리로 화면 상태를 읽고 쓴다. 목업 gops.js 94~130줄의 q/setQ/DW/AG 와 같은 의미.
   - null 이나 "" 를 주면 그 키를 지운다
   - push 가 참이면 뒤로 가기로 돌아올 수 있게 pushState, 아니면 replaceState
   - cur, agent, dw 는 브라우저에도 저장해 화면을 옮겨도 이어진다 */
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { prefs, isDwTab, type DwTab } from "./store";

export type QPatch = Record<string, string | number | null | undefined>;
export type Q = {
  q: (k: string) => string | null;
  setQ: (patch: QPatch, push?: boolean) => void;
  /** 오른쪽 레일에서 펼친 탭. 주소의 dw 가 우선, agent 가 있으면 ai, 아니면 저장된 값 */
  dw: () => DwTab | null;
  /** AI 대화 상태: 주소의 agent 가 우선, 없으면 저장된 값 */
  ag: () => string | null;
  search: string;
};

const clean = (v: string | null): string | null => (v == null ? v : v.replace(/[<>"'&`]/g, ""));
const liveParams = () => new URLSearchParams(window.location.search);

/* 모듈 상태: 목업의 AI_STATE / DW_STATE. localStorage 와 같이 움직인다 */
let AI_STATE: string | null = prefs.ai.get();
let DW_STATE: DwTab | null = prefs.dw.get();

export function readDw(params = liveParams()): DwTab | null {
  const v = params.get("dw");
  if (v != null) return isDwTab(v) ? v : null;
  if (params.get("agent")) return "ai";
  return DW_STATE;
}
export function readAg(params = liveParams()): string | null {
  const v = params.get("agent");
  return v != null ? clean(v) : AI_STATE;
}

/* setQ 의 부수 효과와 주소 계산. 라우터 밖(테스트)에서도 쓸 수 있게 분리 */
export function applyPatch(patch: QPatch, params = liveParams()): string {
  const p = { ...patch };
  if ("cur" in p) prefs.cur.set(p.cur ? String(p.cur) : null);
  if (p.agent && !("dw" in p)) p.dw = "ai";
  if ("agent" in p) { AI_STATE = p.agent ? String(p.agent) : null; prefs.ai.set(AI_STATE); }
  if ("dw" in p) {
    DW_STATE = isDwTab(p.dw as string) ? (p.dw as DwTab) : null; prefs.dw.set(DW_STATE);
    if (DW_STATE) prefs.dwLast.set(DW_STATE);
    // 닫을 때 URL의 agent 값은 지우되 대화 상태는 남겨, 다시 열면 이어지게 한다
    if (!DW_STATE && params.get("agent") && !("agent" in p)) {
      const cur = readAg(params); p.agent = null; AI_STATE = cur; prefs.ai.set(cur);
    }
  }
  for (const [k, v] of Object.entries(p)) (v == null || v === "") ? params.delete(k) : params.set(k, String(v));
  const s = params.toString();
  return s ? "?" + s : "";
}

export function useQ(): Q {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const q = useCallback((k: string) => clean(params.get(k)), [params]);
  const setQ = useCallback((patch: QPatch, push?: boolean) => {
    const search = applyPatch(patch);
    navigate({ pathname: window.location.pathname, search }, { replace: !push });
  }, [navigate]);
  const dw = useCallback(() => readDw(params), [params]);
  const ag = useCallback(() => readAg(params), [params]);
  return { q, setQ, dw, ag, search: location.search };
}
