/* 목업(gops.js) 차트 모듈이 쓰는 데이터 모양. 입력은 전부 매개변수로 받고 전역 상태를 읽지 않는다 */

/** 막대 하나. t는 막대의 시각, v는 거래량(목업은 100만 주 = 1). short·inst·foreign·retail은 하루 단위 투자자별 흐름(주 수) */
export type Bar = {
  t: Date;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  short?: number;
  inst?: number;
  foreign?: number;
  retail?: number;
};

/** 렌코·카기로 바꾼 막대. 카기는 up(방향)·yang(굵은 선) 정보가 더 붙는다 */
export type PlotBar = Bar & { up?: boolean; yang?: boolean };

export type Interval = "1m" | "3m" | "5m" | "10m" | "15m" | "30m" | "60m" | "D" | "W" | "M" | "Y";
export type ChartType = "candle" | "hollow" | "bar" | "line" | "area" | "heikin" | "renko" | "kagi";
export type PaneKey = "vol" | "short" | "retail" | "inst" | "foreign";
export type ToolKey = "trend" | "hline" | "vline" | "rect" | "ellipse" | "measure";

/** 목업 CHS 중 브라우저에 저장하던 부분(gops.chart) */
export type ChartSettings = {
  iv: Interval;
  type: ChartType;
  ma: [number, number, number, number];
  maOn: [boolean, boolean, boolean, boolean];
  volN: number;
  panes: PaneKey[];
  levels: boolean;
  hilo: boolean;
  colors: "kr" | "us";
  magnet: boolean;
};

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  iv: "D", type: "candle", ma: [5, 20, 60, 120], maOn: [true, true, true, true], volN: 20, panes: ["vol"], levels: true, hilo: true, colors: "kr", magnet: true,
};

/** 그린 선의 점: (시각 ms, 가격). 주기를 바꿔도 같은 자리에 남는다 */
export type DrawPoint = { t: number; p: number };
export type Drawing = { id: string; k: ToolKey; a: DrawPoint; b?: DrawPoint };

/** 시간축 표시: 지난 실적(earn)·뉴스(news). n은 기사 번호 */
export type ChartEvent = { t: Date; k: "earn" | "news"; title: string; n?: number };

/** 다가올 일정. earn이 true인 것이 다음 실적 발표 */
export type UpcomingEvent = { t: Date; title: string; earn?: boolean };

/** 가격 기준선. 지지·저항은 목업 levelsOf, 목표가·손절가는 있을 때만 그린다 */
export type Levels = { sup: number; res: number; target1?: number; target2?: number; stop?: number };

/** 사이드바에서 켜는 기준선(52주 고점·저점, 내 평단). 켜진 것만 넘긴다 */
export type RefLineKey = "hi52" | "lo52" | "avg";
export type RefLine = { k: RefLineKey; label: string; p: number };

export type Currency = "usd" | "krw";

/** 코스 문제 차트 한 줄: [날짜 "YYYY-MM-DD", 시가, 고가, 저가, 종가, 거래량] */
export type CourseRow = [string, number, number, number, number, number];
