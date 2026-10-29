import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D6 환율 */
export function useFx() { const ds = useDataSource(); return useResource(() => ds.fx(), [ds]); }
