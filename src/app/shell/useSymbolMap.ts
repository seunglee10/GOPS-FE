/* 종목 마스터를 티커로 바로 찾을 수 있게. 셸 여러 곳이 같이 쓴다 */
import { useMemo } from "react";
import type { SymbolInfo } from "../../api/types";
import { useSymbols } from "../../data/hooks/useSymbols";

export function useSymbolMap(): Record<string, SymbolInfo> {
  const { data } = useSymbols();
  return useMemo(() => Object.fromEntries((data?.items ?? []).map(s => [s.symbol, s])), [data]);
}
