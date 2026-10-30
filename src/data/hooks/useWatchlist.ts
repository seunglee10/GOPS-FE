import { useCallback, useRef } from "react";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
import { invalidate, useInvalidation } from "./invalidate";
/* D17 관심 종목. toggle·remove·add 는 서버에 PUT 하고, 이 훅을 쓰는 모든 곳(헤더 별표·드로어)이 다시 읽는다.
   실행 취소는 반대 동작을 한 번 더 부르면 된다 */
export function useWatchlist() {
  const ds = useDataSource();
  const res = useResource(() => ds.watchlist(), [ds]);
  useInvalidation("watchlist", res.reload);
  const latest = useRef(res.data); latest.current = res.data;
  const set = useMutation(async (symbols: string[]) => { const r = await ds.setWatchlist(symbols); invalidate("watchlist"); return r; });
  const write = useCallback(async (symbol: string, want: boolean | null) => {
    const cur = [...(latest.current?.symbols ?? [])]; const had = cur.includes(symbol);
    const on = want ?? !had; if (on === had) return on;
    const next = on ? [...cur, symbol] : cur.filter(s => s !== symbol);
    latest.current = { symbols: next, updatedAt: latest.current?.updatedAt ?? null };
    await set.run(next); return on;
  }, [set]);
  const toggle = useCallback((symbol: string) => write(symbol, null), [write]);
  const add = useCallback((symbol: string) => write(symbol, true), [write]);
  const remove = useCallback((symbol: string) => write(symbol, false), [write]);
  return { ...res, set, toggle, add, remove, has: (s: string) => !!res.data?.symbols.includes(s) };
}
