import type { OrderRequest } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation } from "./useResource";
/* D21 주문 넣기와 주문 전 점검 */
export function useOrder() {
  const ds = useDataSource();
  const pretrade = useMutation((req: OrderRequest) => ds.pretrade(req));
  const place = useMutation((req: OrderRequest) => ds.placeOrder(req));
  return { pretrade, place };
}
