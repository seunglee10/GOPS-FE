import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D10 분기 매출·수익성 */
export function useFundamentals(symbol: string, period: "quarterly" | "annual" = "quarterly") { const ds = useDataSource(); return useResource(() => ds.fundamentals(symbol, period), [ds, symbol, period], !!symbol); }
