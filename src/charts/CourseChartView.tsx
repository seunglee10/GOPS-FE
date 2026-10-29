import { useMemo, type MouseEvent } from "react";
import { levelFromClick, renderCourseFigure, type CourseAnswerState, type CourseChartData, type CourseQuestion } from "./courseChart";

export type CourseChartProps = {
  q: CourseQuestion;
  chart?: CourseChartData;
  state: CourseAnswerState;
  width?: number;
  compact?: boolean;
  view?: [number, number];
  /** 날을 눌렀을 때 (차트 줄 번호) */
  onTap?: (i: number) => void;
  /** 가격을 골랐을 때 */
  onLevel?: (price: number) => void;
  className?: string;
};

/** 코스 문제 그림. 누르는 영역(data-act)은 SVG 안에 있어서 클릭을 위임해 받는다 */
export function CourseChart({ q, chart, state, width, compact, view, onTap, onLevel, className }: CourseChartProps) {
  const html = useMemo(() => renderCourseFigure({ q, chart, state, width, compact, view }), [q, chart, state, width, compact, view]);
  const click = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as Element).closest<SVGElement>("[data-act]"); if (!el) return;
    const act = el.dataset.act;
    if (act === "cq-tap") onTap?.(+(el.dataset.i ?? 0));
    else if (act === "cq-level") { const p = levelFromClick(el, e.clientY); if (p != null) onLevel?.(p); }
  };
  return <div className={className ?? "c-fig"} onClick={click} dangerouslySetInnerHTML={{ __html: html }} />;
}
export default CourseChart;
