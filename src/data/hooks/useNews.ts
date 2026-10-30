import type { NewsQuery } from "../../api/types";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D13 뉴스 목록. category·symbols 는 서버가 거른다. enabled=false 면 요청하지 않는다 (예: 보유·관심 종목이 없을 때) */
export function useNews(query: NewsQuery, enabled = true) {
  const ds = useDataSource(); const key = JSON.stringify(query);
  return useResource(() => ds.news(query), [ds, key], enabled);
}
