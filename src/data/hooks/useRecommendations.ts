import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D33 오늘의 추천 */
export function useRecommendations() { const ds = useDataSource(); return useResource(() => ds.recommendations(), [ds]); }
