import type { Profile } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D32 사용자 프로필·투자 경험 */
export function useProfile() {
  const ds = useDataSource();
  const res = useResource(() => ds.profile(), [ds]);
  const update = useMutation(async (patch: Partial<Pick<Profile, "experience">>) => { const p = await ds.putProfile(patch); res.reload(); return p; });
  return { ...res, update };
}
