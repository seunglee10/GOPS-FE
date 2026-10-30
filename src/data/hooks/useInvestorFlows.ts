import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* 기관·내부자·공매도. 제공하지 않는 소스는 null */
export function useInvestorFlows(symbol: string) { const ds = useDataSource(); return useResource(() => ds.investorFlows(symbol), [ds, symbol], !!symbol); }
