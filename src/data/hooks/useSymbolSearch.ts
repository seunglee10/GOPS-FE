import { useEffect, useState } from "react";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D19 종목 검색 + 많이 찾는 종목. 타자를 칠 때마다 요청하지 않게 잠깐(200ms) 멈췄을 때 찾는다 */
export function useSymbolSearch(text: string, delayMs = 200) {
  const ds = useDataSource();
  const [q, setQ] = useState(text.trim());
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), text.trim() ? delayMs : 0); return () => clearTimeout(t); }, [text, delayMs]);
  const results = useResource(() => ds.symbolSearch(q), [ds, q], !!q);
  const hot = useResource(() => ds.hotSymbols(), [ds]);
  /* 친 글자와 찾은 글자가 아직 다르면 찾는 중으로 본다 */
  return { results: { ...results, loading: results.loading || (!!text.trim() && text.trim() !== q) }, hot, query: q };
}
