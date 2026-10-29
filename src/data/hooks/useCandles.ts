import type { CandleInterval } from "../../api/types";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D7 캔들 */
export function useCandles(symbol: string, iv: CandleInterval = "D") { const ds = useDataSource(); return useResource(() => ds.candles(symbol, iv), [ds, symbol, iv], !!symbol); }
