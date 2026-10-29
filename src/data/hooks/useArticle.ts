import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D13 뉴스 본문 */
export function useArticle(id: string | null) { const ds = useDataSource(); return useResource(() => ds.article(id!), [ds, id], !!id); }
