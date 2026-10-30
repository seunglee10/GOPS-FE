import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D19 종목 검색 + 많이 찾는 종목 */
export function useSymbolSearch(text: string) {
  const ds = useDataSource();
  const results = useResource(() => ds.symbolSearch(text), [ds, text], !!text.trim());
  const hot = useResource(() => ds.hotSymbols(), [ds]);
  return { results, hot };
}
