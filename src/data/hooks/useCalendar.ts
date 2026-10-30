import type { CalendarQuery } from "../../api/types";
import { useDataSource } from "../source";
import { useResource } from "./useResource";
/* D28 경제·실적 일정과 주간 AI 요약 */
export function useCalendar(query: CalendarQuery) {
  const ds = useDataSource(); const key = JSON.stringify(query);
  const events = useResource(() => ds.calendar(query), [ds, key]);
  const brief = useResource(() => ds.calendarBrief(), [ds]);
  return { events, brief };
}
