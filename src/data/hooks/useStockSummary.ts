import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D9 종목 요약 */
export function useStockSummary(symbol: string) { const ds = useDataSource(); return useResource(() => ds.stockSummary(symbol), [ds, symbol], !!symbol); }
