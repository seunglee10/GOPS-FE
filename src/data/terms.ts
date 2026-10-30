/* 사이드바 '용어 풀이' 사전 (계약 D31: 프론트 정적). 목업 gops.js 1405~1407줄 */
export const TOPIC_NAME: Record<string, string> = { candle: "캔들", trend: "추세", sup: "지지선·저항선", vol: "거래량", rsi: "RSI", per: "PER" };
/* 사전에 싣는 용어: 실전 차트가 있는 주제 + 카드만 있는 용어 */
export const TERM_NAME: Record<string, string> = { ...TOPIC_NAME, range: "52주 범위", opm: "영업이익률" };
