import type { PreferencesData } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D34 화면 설정 동기화 */
export function usePreferences() {
  const ds = useDataSource();
  const res = useResource(() => ds.preferences(), [ds]);
  const save = useMutation(async (data: PreferencesData) => { const p = await ds.putPreferences(data); res.reload(); return p; });
  return { ...res, save };
}
