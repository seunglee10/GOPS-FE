import type { NewsQuery } from "../../api/types";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D13 뉴스 목록 */
export function useNews(query: NewsQuery) {
  const ds = useDataSource(); const key = JSON.stringify(query);
  return useResource(() => ds.news(query), [ds, key]);
}
