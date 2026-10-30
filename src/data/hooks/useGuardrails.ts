import type { Guardrails } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D26 가드레일 */
export function useGuardrails() {
  const ds = useDataSource();
  const res = useResource(() => ds.guardrails(), [ds]);
  const patch = useMutation(async (p: Partial<Guardrails>) => { const g = await ds.patchGuardrails(p); res.reload(); return g; });
  return { ...res, patch };
}
