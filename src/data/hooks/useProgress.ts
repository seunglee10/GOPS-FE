import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D30 코스 진행 */
export function useProgress(courseId = "chart-basics") {
  const ds = useDataSource();
  const res = useResource(() => ds.progress(courseId), [ds, courseId]);
  const mark = useMutation(async (questionId: string, correct: boolean) => { const p = await ds.postProgress({ courseId, questionId, correct }); res.reload(); return p; });
  return { ...res, mark };
}
