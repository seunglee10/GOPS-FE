import { useEffect, useRef } from "react";
import { mountMainChart, type MainChartHandle, type MainChartProps } from "./mainChart";

export type ChartViewProps = MainChartProps & { className?: string; style?: React.CSSProperties };

/** 종목 차트. ref 컨테이너에 한 번 마운트하고, props 가 바뀌면 update, 사라지면 destroy */
export function ChartView({ className, style, ...props }: ChartViewProps) {
  const ref = useRef<HTMLDivElement>(null), handle = useRef<MainChartHandle | null>(null), latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    handle.current = mountMainChart(el, latest.current);
    return () => { handle.current?.destroy(); handle.current = null; };
  }, []);
  useEffect(() => { handle.current?.update(props); });
  return <div ref={ref} className={className ? `chartbox ${className}` : "chartbox"} style={style} />;
}
export default ChartView;
