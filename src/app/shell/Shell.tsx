/* 공통 틀: 상단바, 알림함, 아바타 메뉴, 본문, 오른쪽 레일, 드로어, 시트·대화상자, 토스트. 목업 gops.js mountShell(234)·renderShell(281)·render(3308)
   DOM 순서를 목업과 같게 두어 gops.css 가 그대로 먹는다 */
import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Ic } from "../icons";
import { FOOTER_PAGES, SCROLL_PAGES, type PageKey } from "../nav";
import { useActions } from "./actions";
import { TopBar } from "./TopBar";
import { BellMenu } from "./Bell";
import { AvatarMenu } from "./AvatarMenu";
import { Rail } from "./Rail";
import { Drawer } from "./Drawer";
import { Overlay } from "./Sheet";
import { Dialog } from "./Dialog";
import { Toasts } from "./Toast";

export function SiteFooter() {
  return <footer className="sitefoot">
    <div className="ft-top"><span className="wordmark"><Ic name="logo" />GOPS</span>
      <nav aria-label="서비스 정보"><a href="#">서비스 소개</a><a href="#">이용약관</a><a href="#"><b>개인정보처리방침</b></a><a href="#">투자 유의사항</a><a href="#">공지사항</a><a href="#">고객센터</a></nav></div>
    <p>GOPS는 실제 돈이 아닌 모의투자 서비스예요. AI 답변과 분석은 투자 판단을 돕는 참고 정보이며, 수익을 보장하지 않아요. 실제 투자 결정과 그 결과의 책임은 투자자 본인에게 있어요.</p>
    <p>시세 Alpaca (미국 주식, 일부 종목 15분 지연) · 재무 SEC EDGAR · 실적 추정치 Yahoo Finance · 환율 하나은행 고시 기준</p>
    <p className="ft-copy">© 2026 GOPS</p>
  </footer>;
}

/* body 의 data-page 와 틀 클래스. 페이지 컴포넌트도 usePage 로 같은 값을 쓴다 */
export function usePage(page: PageKey) {
  useEffect(() => { document.body.dataset.page = page; return () => { delete document.body.dataset.page; }; }, [page]);
}

/* Google·Kakao 첫 가입은 약관 동의(needsConsent)를 마쳐야 앱을 쓴다 (계약 D39) */
function useConsentGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user?.needsConsent) navigate("/google", { replace: true }); }, [user?.needsConsent, navigate]);
}

export function Shell({ page, children }: { page: PageKey; children: ReactNode }) {
  const act = useActions(page);
  const { q, setQ } = act;
  usePage(page);
  useConsentGate();
  const bigchart = page === "stock" && q("view") === "chart";
  useEffect(() => {
    document.body.classList.toggle("wide", page === "market" || page === "stock");
    document.body.classList.toggle("bigchart", bigchart);
  }, [page, bigchart]);
  /* Esc: 대화상자 → 시트 → 메뉴 순으로 닫는다. 빈 곳을 누르면 메뉴를 닫는다 (목업 3329, 3490~3494줄) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null; if (t && (t.id === "hsearchinput" || t.id === "agentinput")) return;
      if (q("dialog")) setQ({ dialog: null, step: null, welcome: null });
      else if (q("sheet")) act.closeSheet();
      else setQ({ pop: null, menu: null, bell: null, term: null });
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, [data-act], .menu")) return;
      if (q("menu") || q("bell") || q("me") || (q("term") && !t?.closest("#termcard"))) setQ({ menu: null, bell: null, me: null, term: null });
    };
    document.addEventListener("keydown", onKey); document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [q, setQ, act]);
  const scroll = SCROLL_PAGES.includes(page) || (page === "stock" && q("view") !== "chart");
  return <>
    <TopBar page={page} act={act} />
    <BellMenu act={act} /><AvatarMenu act={act} />
    <main id="page" className={`page${scroll ? " scroll" : ""}`}>
      <div className="container">{children}{FOOTER_PAGES.includes(page) ? <SiteFooter /> : null}</div>
    </main>
    <Rail act={act} />
    <Drawer page={page} act={act} />
    <Overlay act={act} dialog={<Dialog act={act} />} />
    <Toasts act={act} />
  </>;
}

/* 로그인·가입 화면의 틀: 상단에 로고와 반대쪽 링크만 (목업 235~240줄) */
export function AuthShell({ page, children }: { page: PageKey; children: ReactNode }) {
  const act = useActions(page);
  usePage(page);
  const toLogin = page !== "login";
  return <>
    <header className="authbar"><div className="authin"><Link className="wordmark" to="/"><Ic name="logo" />GOPS</Link><span className="spacer"></span>
      <span className="muted">{toLogin ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}</span><Link className="btn sm outline" to={toLogin ? "/login" : "/signup"}>{toLogin ? "로그인" : "회원가입"}</Link></div></header>
    <main id="page" className="authmain">{children}</main>
    <Overlay act={act} dialog={<Dialog act={act} />} />
    <Toasts act={act} />
  </>;
}
