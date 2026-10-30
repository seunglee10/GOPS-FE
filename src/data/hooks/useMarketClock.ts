import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D4 장 상태 */
export function useMarketClock() { const ds = useDataSource(); return useResource(() => ds.marketClock(), [ds]); }
