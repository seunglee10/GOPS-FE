import type { OrdersQuery } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D22 주문 내역·취소 */
export function useOrders(query: OrdersQuery = {}) {
  const ds = useDataSource(); const key = JSON.stringify(query);
  const res = useResource(() => ds.orders(query), [ds, key]);
  const cancel = useMutation(async (orderId: string) => { await ds.cancelOrder(orderId); res.reload(); });
  return { ...res, cancel };
}
