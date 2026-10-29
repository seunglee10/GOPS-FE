/* 데모 사용자, 관심·최근 본 종목, 알림함. 목업 gops.js 380, 407, 941, 506~515, 3146~3171줄 */
import type { Notification, Profile } from "../../api/types";

export const DEMO_EMAIL = "seung@example.com";
export const DEMO_USER: Profile = { name: "승리", email: DEMO_EMAIL, initials: "SL", experience: null };

export const WATCH = ["NVDA", "MSFT", "AMD", "AVGO", "TSLA", "AAPL", "LLY"];
export const RECENT = ["NVDA", "AVGO", "MSFT", "TSLA", "COST"];
/* 드로어 '최근 본': 오늘 본 순서, 어제 */
export const RECENT_TODAY = ["NVDA", "AVGO", "MSFT"];
export const RECENT_YESTERDAY = ["TSLA", "COST"];
/* 헤더 검색: 최근 검색어와 많이 찾는 종목 */
export const RECENT_SEARCHES = ["엔비디아", "AVGO", "테슬라"];
export const HOT_SYMBOLS = ["NVDA", "TSLA", "AAPL", "AMD"];
/* 로그아웃 상태의 종목 목록(지금 많이 움직인 종목) */
export const GUEST_MOVERS = ["AMD", "MU", "NVDA", "TSLA", "META", "UNH"];

export const BELL_ITEMS: Notification[] = [
  { id: "nt1", titleKo: "TSLA 하루 등락률 -5% 이하", metaKo: "9/24 23:02, 규칙 발동", href: "/stock?s=TSLA", read: false, at: "2026-09-24T14:02:00Z" },
  { id: "nt2", titleKo: "NVDA 거래량이 평균의 2배를 넘었어요", metaKo: "오늘 09:40, 에이전트 감지", href: "/stock?s=NVDA&hl=1", read: false, at: "2026-09-30T00:40:00Z" },
  { id: "nt3", titleKo: "AVGO 매수 10주 체결", metaKo: "9/29 22:31, $179.80", href: "/portfolio?tab=orders", read: true, at: "2026-09-29T13:31:00Z" },
];
export const BELL_COUNT = 3;

/* 드로어 '관심' 맨 위 AI 한 줄 */
export const WATCH_AI_LINE = "엔비디아, 공급망 보고서 소식에 2.12% 상승";

/* 오늘의 추천 (D33). 목업 홈에는 따로 없어서 홈 순위 표의 이유 줄을 재사용한다 */
export const RECOMMENDED = ["NVDA", "AMD", "AVGO"];
