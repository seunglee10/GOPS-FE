import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D12 실적일·차트 이벤트 */
export function useChartEvents(symbol: string) { const ds = useDataSource(); return useResource(() => ds.chartEvents(symbol), [ds, symbol], !!symbol); }
