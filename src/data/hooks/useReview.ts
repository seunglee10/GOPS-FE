import type { ReviewNoteRequest } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D27 투자 복기 */
export function useReview(month: string) {
  const ds = useDataSource();
  const res = useResource(() => ds.review(month), [ds, month]);
  const saveNote = useMutation(async (orderId: string, note: ReviewNoteRequest) => { await ds.saveReviewNote(orderId, note); res.reload(); });
  return { ...res, saveNote };
}
