import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D1 종목 마스터 */
export function useSymbols() { const ds = useDataSource(); return useResource(() => ds.symbols(), [ds]); }
