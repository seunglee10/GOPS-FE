import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D11 지지·저항 */
export function useLevels(symbol: string) { const ds = useDataSource(); return useResource(() => ds.levels(symbol), [ds, symbol], !!symbol); }
