import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D20 계좌 요약·성과·최근 활동 */
export function useAccount() {
  const ds = useDataSource();
  const summary = useResource(() => ds.account(), [ds]);
  const performance = useResource(() => ds.performance(), [ds]);
  const activity = useResource(() => ds.activity(20), [ds]);
  return { summary, performance, activity };
}
