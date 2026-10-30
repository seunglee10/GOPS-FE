/* 종목 로고 표. 목업 gops.js 75~90줄을 그대로 옮겼다.
   실제 로고(Financial Modeling Prep 무료 이미지)는 public/logos 에 두고, 없는 종목은 회사 색 사각형에 첫 글자를 쓴다. */

export const LOGO_C: Record<string, string> = { GOOGL: "#4285F4", AMZN: "#FF9900", CRM: "#00A1E0", ADBE: "#FA0F00", QCOM: "#3253DC", TXN: "#CC0000", INTU: "#236CFF",
  DIS: "#113CCF", TMUS: "#E20074", HD: "#F96302", MCD: "#DA291C", LOW: "#004990", "BRK.B": "#4B2E83", V: "#1A1F71", MA: "#EB001B",
  BAC: "#E31837", WFC: "#D71E28", GS: "#6F9FD8", JNJ: "#D51900", ABBV: "#071D49", MRK: "#00857C", TMO: "#E71316", GE: "#3B73B9",
  CAT: "#FFCD11", RTX: "#E1251B", UNP: "#004B87", HON: "#DC1E35", WMT: "#0071CE", PG: "#003DA5", KO: "#F40009", PEP: "#004B93",
  XOM: "#ED1B2D", CVX: "#0054A4", COP: "#D51920",
  ADI: "#0067B9", ANET: "#1D3C6E", BA: "#0039A6", BLK: "#111111", CEG: "#0B3D91", IBM: "#1F70C1", LMT: "#00366B", UBER: "#111111" };

export const HAS_LOGO = new Set<string>(["AAPL", "ABBV", "ADBE", "AMD", "AMZN", "ARM", "AVGO", "BAC", "BRK.B", "CAT", "COP", "COST", "CRM", "CVX", "DIS", "GE", "GOOGL", "GS", "HD", "HON", "INTU", "JNJ", "JPM", "KO", "LLY", "LOW", "MA", "MCD", "META", "MRK", "MSFT", "MU", "NFLX", "NKE", "NVDA", "ORCL", "PEP", "PG", "QCOM", "RTX", "TMO", "TMUS", "TSLA", "TSM", "TXN", "UNH", "UNP", "V", "WFC", "WMT", "XOM",
  "CSCO", "ACN", "IBM", "NOW", "AMAT", "PANW", "ADI", "ANET", "LRCX", "KLAC", "VZ", "T", "CMCSA", "BKNG", "TJX", "SBUX", "AXP", "MS", "SPGI", "BLK", "C", "SCHW", "ABT", "DHR", "AMGN", "ISRG", "PFE", "BMY", "UBER", "LMT", "ETN", "DE", "BA", "UPS", "PM", "MDLZ", "MO", "EOG", "SLB", "LIN", "SHW", "ECL", "APD", "FCX", "NEE", "SO", "DUK", "CEG", "PLD", "AMT", "EQIX", "WELL"]);

/* LOGO_BG:start (목업 tools/logo-bg.py 가 만든 표. 손으로 고치지 말고 스크립트를 다시 실행) */
export const LOGO_BG: Record<string, string> = { ABBV: "brand", ADI: "brand", ANET: "brand", ARM: "#0090bf", BA: "brand", BLK: "brand", "BRK.B": "#2b3191", CEG: "brand", DIS: "brand", IBM: "brand", INTU: "#0077c9", LMT: "brand", NKE: "brand", UBER: "brand", UNH: "brand", V: "brand", WFC: "#d71e28" };
/* LOGO_BG:end */

/** 로고 이미지 주소. public/logos 에 있는 파일만 (HAS_LOGO) 가리킨다. 없으면 null */
export function logoUrl(symbol: string): string | null {
  return HAS_LOGO.has(symbol) ? `/logos/${symbol}.png` : null;
}

/** 종목 색: 종목 마스터의 색이 우선, 없으면 LOGO_C, 그것도 없으면 회색 */
export function markColor(symbol: string, symbolColor?: string | null): string {
  return symbolColor || LOGO_C[symbol] || "#8894A6";
}

/** 로고 네모 바탕: 표에 없으면 흰색(undefined), 색 값이면 로고 가장자리 색, "brand"면 흰 로고라 회사 색 */
export function logoBg(symbol: string, symbolColor?: string | null): string | undefined {
  const v = LOGO_BG[symbol];
  if (!v) return undefined;
  return v === "brand" ? markColor(symbol, symbolColor) : v;
}
