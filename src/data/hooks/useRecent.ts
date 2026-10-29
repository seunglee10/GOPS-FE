import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D18 최근 본 종목 */
export function useRecent() {
  const ds = useDataSource();
  const res = useResource(() => ds.recent(), [ds]);
  const add = useMutation(async (symbol: string) => { await ds.addRecent(symbol); res.reload(); });
  return { ...res, add };
}
