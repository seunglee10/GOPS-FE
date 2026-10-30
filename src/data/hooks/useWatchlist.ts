import { useCallback } from "react";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D17 관심 종목. toggle 은 서버에 PUT 하고 다시 읽는다 */
export function useWatchlist() {
  const ds = useDataSource();
  const res = useResource(() => ds.watchlist(), [ds]);
  const set = useMutation((symbols: string[]) => ds.setWatchlist(symbols));
  const toggle = useCallback(async (symbol: string) => {
    const cur = new Set(res.data?.symbols ?? []); const had = cur.has(symbol);
    if (had) cur.delete(symbol); else cur.add(symbol);
    await set.run([...cur]); res.reload(); return !had;
  }, [res, set]);
  return { ...res, set, toggle, has: (s: string) => !!res.data?.symbols.includes(s) };
}
