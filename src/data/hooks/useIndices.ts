import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D3 지수 묶음 */
export function useIndices() { const ds = useDataSource(); return useResource(() => ds.indices(), [ds]); }
