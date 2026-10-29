import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D15 오늘 시장 요약 */
export function useMarketBrief() { const ds = useDataSource(); return useResource(() => ds.marketBrief(), [ds]); }
