import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D29 코스 문제·실제 시세 */
export function useCourse(courseId = "chart-basics") { const ds = useDataSource(); return useResource(() => ds.course(courseId), [ds, courseId]); }
