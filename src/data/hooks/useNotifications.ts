import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D25 알림함 */
export function useNotifications() {
  const ds = useDataSource();
  const res = useResource(() => ds.notifications(), [ds]);
  const readAll = useMutation(async () => { await ds.readAllNotifications(); res.reload(); });
  return { ...res, readAll };
}
