import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D2 섹터·트리맵 */
export function useHeatmap() { const ds = useDataSource(); return useResource(() => ds.heatmap(), [ds]); }
