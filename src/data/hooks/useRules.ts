import type { RuleRequest } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D23 규칙 목록·만들기·켜고 끄기·삭제 */
export function useRules() {
  const ds = useDataSource();
  const res = useResource(() => ds.rules(), [ds]);
  const create = useMutation(async (req: RuleRequest) => { const r = await ds.createRule(req); res.reload(); return r; });
  const setEnabled = useMutation(async (id: string, enabled: boolean) => { const r = await ds.patchRule(id, { enabled }); res.reload(); return r; });
  const remove = useMutation(async (id: string) => { await ds.deleteRule(id); res.reload(); });
  return { ...res, create, setEnabled, remove };
}
