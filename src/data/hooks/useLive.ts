import { useEffect, useState } from "react";
import type { LiveQuote } from "../../api/types";
import { useDataSource } from "../source";
/* D8 실시간 시세. 구독하는 동안만 틱이 돈다 */
export function useLive(symbol: string | null, enabled = true): LiveQuote | null {
  const ds = useDataSource();
  const [q, setQ] = useState<LiveQuote | null>(null);
  useEffect(() => {
    if (!symbol || !enabled) { setQ(null); return; }
    let st: ReturnType<typeof ds.live>;
    try { st = ds.live(symbol); } catch { setQ(null); return; }
    setQ(st.snapshot());
    return st.subscribe(setQ);
  }, [ds, symbol, enabled]);
  return q;
}
