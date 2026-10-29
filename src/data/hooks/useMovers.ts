import type { MoversSort } from "../../api/types";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D5 홈 순위표 */
export function useMovers(sort: MoversSort, market: "" | "kr" | "us" = "", limit?: number) {
  const ds = useDataSource(); return useResource(() => ds.movers({ sort, market, limit }), [ds, sort, market, limit]);
}
