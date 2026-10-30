import type { QuickAlertRequest } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation } from "./useResource";
/* D24 빠른 가격 알림 */
export function useQuickAlert() { const ds = useDataSource(); return useMutation((req: QuickAlertRequest) => ds.quickAlert(req)); }
