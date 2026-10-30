/* 화면 키, 주소, 상단 탭. 목업의 index.html 같은 파일 이름을 라우트 경로로 바꾼다 */
export type PageKey = "home" | "market" | "stock" | "news" | "portfolio" | "calendar" | "coach" | "course" | "login" | "signup" | "verify" | "google" | "forgot";
export const PATH: Record<PageKey, string> = {
  home: "/", market: "/market", stock: "/stock", news: "/news", portfolio: "/portfolio", calendar: "/calendar", coach: "/coach", course: "/course",
  login: "/login", signup: "/signup", verify: "/verify", google: "/google", forgot: "/forgot",
};
export const AUTH_PAGES: PageKey[] = ["login", "signup", "verify", "google", "forgot"];
export const isAuthPage = (p: PageKey): boolean => AUTH_PAGES.includes(p);
/* 종목 화면은 탭이 아니라 검색, 목록, 최근 본으로 들어가는 화면이라 탭에서 뺀다 */
export const NAV: [key: PageKey, label: string, href: string][] = [["home", "홈", "/"], ["portfolio", "내 계좌", "/portfolio"], ["coach", "투자 복기", "/coach"]];
/* 본문이 스크롤되는 화면 (지도와 큰 차트는 한 화면에 맞춘다) */
export const SCROLL_PAGES: PageKey[] = ["portfolio", "home", "coach", "course", "calendar", "news"];
export const FOOTER_PAGES: PageKey[] = ["home", "portfolio", "coach", "calendar", "news"];
export const stockHref = (s: string, extra = ""): string => `/stock?s=${s}${extra}`;
