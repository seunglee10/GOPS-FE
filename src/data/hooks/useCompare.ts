import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* 비교 탭: 여러 종목을 한 표로 */
export function useCompare(symbols: string[]) { const ds = useDataSource(); const key = symbols.join(","); return useResource(() => ds.compare(symbols), [ds, key], symbols.length > 0); }
