/* 목업 gops.js 의 종목 마스터와 시장 표 (6~40, 650~727줄). 값은 전부 가짜다. */

export const FX = 1382.5;
export const CASH = 9840;

export type MockSymbol = { ko: string; ex: string; c: string; p: number; d: number; cap: number };
export const S: Record<string, MockSymbol> = {
  NVDA: { ko: "엔비디아", ex: "나스닥", c: "#76B900", p: 142.30, d: 2.12, cap: 3490 },
  MSFT: { ko: "마이크로소프트", ex: "나스닥", c: "#00A4EF", p: 438.20, d: 0.58, cap: 3260 },
  AAPL: { ko: "애플", ex: "나스닥", c: "#8a8a8a", p: 231.40, d: -0.18, cap: 3510 },
  AVGO: { ko: "브로드컴", ex: "나스닥", c: "#CC092F", p: 181.45, d: 1.34, cap: 850 },
  AMD:  { ko: "AMD", ex: "나스닥", c: "#3a3a3a", p: 168.90, d: 3.05, cap: 273 },
  LLY:  { ko: "일라이 릴리", ex: "NYSE", c: "#D52B1E", p: 905.10, d: -0.42, cap: 860 },
  COST: { ko: "코스트코", ex: "나스닥", c: "#005DAA", p: 912.35, d: 0.21, cap: 404 },
  ORCL: { ko: "오라클", ex: "NYSE", c: "#C74634", p: 171.80, d: 1.02, cap: 475 },
  JPM:  { ko: "JP모건", ex: "NYSE", c: "#6b5a44", p: 224.60, d: -0.35, cap: 640 },
  TSLA: { ko: "테슬라", ex: "나스닥", c: "#CC0000", p: 258.10, d: -1.84, cap: 825 },
  META: { ko: "메타", ex: "나스닥", c: "#0866FF", p: 591.20, d: 1.48, cap: 1480 },
  MU:   { ko: "마이크론", ex: "나스닥", c: "#5A2D82", p: 104.30, d: 2.64, cap: 120 },
  TSM:  { ko: "TSMC", ex: "NYSE", c: "#C8102E", p: 196.40, d: 1.92, cap: 1020 },
  ARM:  { ko: "ARM", ex: "나스닥", c: "#0091BD", p: 148.20, d: 2.31, cap: 155 },
  NKE:  { ko: "나이키", ex: "NYSE", c: "#111111", p: 76.80, d: -1.05, cap: 120 },
  NFLX: { ko: "넷플릭스", ex: "나스닥", c: "#B20710", p: 702.10, d: -0.72, cap: 300 },
  UNH:  { ko: "유나이티드헬스", ex: "NYSE", c: "#002677", p: 588.30, d: -1.21, cap: 540 },
};

/* S&P 500 11개 섹터와 큰 종목들. [티커, 시가총액(십억 달러), 등락률] */
export type SectorTicker = [symbol: string, capB: number, changePercent: number];
export type Sector = [name: string, tickers: SectorTicker[]];
export const SECTORS: Sector[] = [
  ["정보기술", [["AAPL",3510,-0.18],["MSFT",3260,0.58],["NVDA",3490,2.12],["AVGO",850,1.34],["ORCL",475,1.02],["AMD",273,3.05],["CRM",260,0.44],["ADBE",230,-0.61],["CSCO",230,0.38],["ACN",220,-0.32],["IBM",210,0.61],["NOW",190,0.74],["QCOM",185,0.92],["TXN",180,-0.21],["INTU",175,0.33],["AMAT",150,1.82],["MU",120,2.64],["PANW",120,0.52],["ADI",110,0.88],["ANET",110,1.24],["LRCX",95,2.08],["KLAC",90,1.61]]],
  ["커뮤니케이션", [["GOOGL",2050,0.92],["META",1480,1.48],["NFLX",300,-0.72],["TMUS",250,0.12],["VZ",180,-0.22],["DIS",170,-0.31],["T",160,0.14],["CMCSA",160,-0.48]]],
  ["임의소비재", [["AMZN",1960,0.37],["TSLA",825,-1.84],["HD",390,-0.25],["MCD",215,0.12],["BKNG",160,0.63],["LOW",140,-0.4],["TJX",130,0.29],["NKE",120,-1.05],["SBUX",110,-0.82]]],
  ["금융", [["BRK.B",980,0.08],["JPM",640,-0.35],["V",560,0.22],["MA",470,0.31],["BAC",310,-0.88],["WFC",200,-0.62],["AXP",190,0.41],["MS",170,-0.18],["GS",160,-0.12],["SPGI",160,0.19],["BLK",140,0.08],["C",120,-0.71],["SCHW",120,-0.33]]],
  ["헬스케어", [["LLY",860,-0.42],["UNH",540,-1.21],["JNJ",390,0.15],["ABBV",340,0.47],["MRK",280,-0.66],["TMO",210,0.2],["ABT",200,0.31],["DHR",180,-0.38],["AMGN",170,0.22],["ISRG",170,0.84],["PFE",165,-0.91],["BMY",105,-0.47]]],
  ["산업재", [["GE",200,0.66],["CAT",180,0.81],["RTX",160,0.25],["UBER",160,1.12],["UNP",140,-0.3],["LMT",140,0.18],["HON",135,-0.18],["ETN",135,0.92],["DE",115,0.37],["BA",110,-1.41],["UPS",110,-0.58]]],
  ["필수소비재", [["WMT",680,0.28],["COST",404,0.21],["PG",400,-0.14],["KO",300,0.05],["PEP",230,-0.34],["PM",190,0.42],["MDLZ",90,-0.21],["MO",90,0.09]]],
  ["에너지", [["XOM",480,-0.95],["CVX",280,-0.52],["COP",130,-1.3],["EOG",70,-0.81],["SLB",60,-1.12]]],
  ["소재", [["LIN",220,0.18],["SHW",90,-0.28],["ECL",70,0.31],["APD",65,0.11],["FCX",65,-1.58]]],
  ["유틸리티", [["NEE",160,0.42],["SO",95,0.21],["DUK",85,0.08],["CEG",80,1.94]]],
  ["부동산", [["PLD",105,-0.41],["AMT",100,-0.62],["EQIX",85,0.27],["WELL",80,0.19]]],
];
export const sectorOf = (s: string): [string, SectorTicker[]] => SECTORS.find(([, t]) => t.some(x => x[0] === s)) || ["시장", []];

/* 홈 순위 표: 왼쪽은 누구나 아는 시세, 오른쪽은 이유·차트 모양·내 계좌 같은 사실. 고르거나 점수를 매기지 않는다 */
export const TRADE: Record<string, number> = { NVDA: 58.6, AMD: 18.2, MU: 4.8, TSLA: 24.1, META: 11.3, UNH: 3.9, AVGO: 9.4, MSFT: 12.7, LLY: 4.1, COST: 2.6, TSM: 6.2, ARM: 1.9, NKE: 1.2, JPM: 3.3, NFLX: 4, ORCL: 2.1, AAPL: 9.8 };   // 거래대금, 십억 달러
export const WHY: Record<string, [reason: string, source: string]> = { NVDA: ["새 칩 출하가 앞당겨진다는 보고서", "뉴스 3"], AMD: ["엔비디아와 함께 반도체가 강세", "차트"], MU: ["메모리 값이 오를 거라는 전망", "뉴스 2"],
  TSLA: ["이번 달 판매량이 예상보다 적다는 보도", "뉴스 1"], META: ["광고 매출 전망을 올린 보고서", "뉴스 1"], UNH: ["보험금 지급이 늘어날 거라는 우려", "뉴스 2"],
  TSM: ["엔비디아 칩 주문이 늘 거라는 기대", "뉴스 2"], ARM: ["AI 칩 설계 수요 증가", "뉴스 1"], AVGO: ["AI 네트워크 칩 주문 증가", "뉴스 1"],
  ORCL: ["대형 클라우드 계약 수주 공시", "뉴스 1"], NKE: ["실적 발표를 앞두고 약세", "차트"], NFLX: ["요금 인상 발표 뒤 차익 실현", "뉴스 1"],
  "005930": ["외국인 순매수가 이어짐", "뉴스 2"], "000660": ["HBM 공급 계약 보도", "뉴스 1"], "042700": ["HBM 장비 수주 공시", "뉴스 1"], "012450": ["방산 수출 계약 지연 보도", "뉴스 1"] };
export const CHART: Record<string, string> = { NVDA: "지지선보다 3% 위", AMD: "20일 평균선을 뚫고 올라감", MU: "최근 고점 근처", TSLA: "지지선 근처까지 내려옴", META: "옆으로 횡보 중",
  UNH: "1년 중 가장 낮은 가격 근처", AVGO: "20일 평균선 위", MSFT: "완만하게 오르는 중", LLY: "잠시 쉬어 가는 구간", COST: "옆으로 횡보 중", TSM: "최근 고점 근처", ARM: "20일 평균선 위",
  ORCL: "최근 고점 근처", NKE: "20일 평균선 아래", NFLX: "옆으로 횡보 중", JPM: "20일 평균선 근처", AAPL: "옆으로 횡보 중",
  "005930": "최근 고점 근처", "000660": "20일 평균선 위", "012450": "20일 평균선 아래", "042700": "최근 고점을 넘어섬", "009150": "옆으로 횡보 중", "402340": "옆으로 횡보 중", "036930": "20일 평균선 위" };

/* 국내 종목(목 데이터). 키는 종목코드, p는 원화 가격, trade는 거래대금(억 원), cap은 시가총액(조 원). 홈 순위 표에서만 쓴다.
   API 계약에서는 v1 범위 밖(S&P 500 만) */
export type MockKrSymbol = { ko: string; c: string; p: number; d: number; trade: number; cap: number };
export const KR_S: Record<string, MockKrSymbol> = {
  "005930": { ko: "삼성전자", c: "#1428A0", p: 219500, d: 1.85, trade: 18200, cap: 1300 },
  "000660": { ko: "SK하이닉스", c: "#EA002C", p: 1284000, d: 0.94, trade: 15400, cap: 935 },
  "012450": { ko: "한화에어로스페이스", c: "#F37321", p: 1012000, d: -3.12, trade: 5200, cap: 51 },
  "042700": { ko: "한미반도체", c: "#00468C", p: 148300, d: 6.24, trade: 4100, cap: 14 },
  "009150": { ko: "삼성전기", c: "#1428A0", p: 1183000, d: -0.42, trade: 3100, cap: 88 },
  "402340": { ko: "SK스퀘어", c: "#EA002C", p: 785000, d: 0.12, trade: 2400, cap: 104 },
  "036930": { ko: "주성엔지니어링", c: "#B22222", p: 212500, d: 0.95, trade: 1900, cap: 10 },
};
export const ST = (k: string): MockSymbol | MockKrSymbol | undefined => S[k] || KR_S[k];
export const capB = (k: string): number => KR_S[k] ? KR_S[k].cap * 1000 / (FX * 10) : S[k].cap;   // 시가총액을 십억 달러로
export const tradeB = (k: string): number | undefined => KR_S[k] ? KR_S[k].trade / (FX * 10) : TRADE[k];   // 거래대금을 십억 달러로 맞춰 비교·표시
export const VOL = (k: string): number => KR_S[k] ? KR_S[k].trade * 1e8 / KR_S[k].p : TRADE[k] * 1e9 / S[k].p;   // 거래량(주)

/* "많이 움직인 종목"의 기준과 홈 표의 탭 */
export const MOVE_SORT: [key: string, label: string][] = [["", "거래대금"], ["vol", "거래량"], ["up", "급상승"], ["down", "급하락"]];
export const MKT_PICK: [key: string, label: string][] = [["", "전체"], ["kr", "국내"], ["us", "해외"]];
export const HT_TABS: [key: string, label: string][] = [["", "실시간 순위"], ["hold", "보유 종목"], ["watch", "관심 종목"]];
/* 지도 기간: [키, 이름, 색이 가장 진해지는 등락률]. 기간이 길수록 움직임이 커서 색 기준도 넓힌다. 홈 지도는 늘 1일 */
export const MAP_PERIODS: [key: string, label: string, max: number][] = [["", "1일", 3], ["1w", "1주", 6], ["1m", "1개월", 12]];

/* 홈 맨 위 시장 지수: 세 줄씩 세 묶음. [이름, 값, 변화, 변화율, 이유 꼬리표, 작은 차트 모양, 급하락 표시] */
export type MktItem = [name: string, value: string, change: number, changePercent: number, why: string, shape?: string, flag?: string];
export const MKT: MktItem[][] = [
  [["코스피", "5,717.93", 49.88, 0.88, "외국인·기관 순매수"], ["코스닥", "801.62", 6.84, 0.86, "위험선호 회복"], ["달러 환율", "1,329.90", -12.5, -0.93, "반도체 수출 호조"]],
  [["VIX", "19.99", 3.53, 21.44, "", "spike"], ["나스닥 100 선물", "29,797.25", 405.75, 1.38, ""], ["나스닥", "26,140.03", -572.99, -2.14, "AI 투자 우려", "", "급하락"]],
  [["S&P 500", "7,659.44", -84.62, -1.09, "인플레이션 부담"], ["필라델피아 반도체", "11,137.28", -443.93, -3.83, ""]],
];
/* 홈 상단 장 상태 줄 */
export const MKT_SESSIONS: { label: string; open: string; close: string }[] = [
  { label: "국내 정규장", open: "09:00", close: "15:30" }, { label: "해외 데이마켓", open: "09:00", close: "17:00" }];
