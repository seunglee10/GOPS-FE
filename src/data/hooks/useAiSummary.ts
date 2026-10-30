import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D14 종목 AI 요약 */
export function useAiSummary(symbol: string) { const ds = useDataSource(); return useResource(() => ds.aiSummary(symbol), [ds, symbol], !!symbol); }
