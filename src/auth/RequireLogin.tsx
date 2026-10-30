/* 로그인해야 보이는 화면(내 계좌, 투자 복기). 로그아웃 상태면 목업 guestPage()(3158줄)를 보여 준다.
   로그인 상태는 useSession: api 모드는 /api/auth/me, 목업 모드는 gops.guest·?guest=1 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../app/icons";
import { useSession } from "../app/session";
import { backHref } from "../app/shell/actions";

export function RequireLogin({ page, children }: { page: "portfolio" | "coach"; children: ReactNode }) {
  const { guest, loading } = useSession();
  if (loading) return null;
  if (!guest) return <>{children}</>;
  const coach = page === "coach";
  const next = encodeURIComponent(backHref());
  return <section className="panel" style={{ minHeight: "100%" }}><div className="state"><span className="ic"><Ic name={coach ? "list" : "wallet"} /></span>
    <h3>{coach ? "로그인하면 내 거래를 복기해 드려요" : "로그인하면 내 자산을 볼 수 있어요"}</h3>
    <p>{coach ? "장 마감 뒤 주문마다 판단과 결과를 나눠 보여 줘요. 가입하면 모의투자 계좌가 바로 열려요." : "보유 종목, 주문 내역, 규칙, 관심 종목을 한곳에서 관리해요. 가입하면 $10,000 모의투자 계좌가 바로 열려요."}</p>
    <div className="actions"><Link className="btn primary" to={`/login?next=${next}`}>로그인</Link><Link className="btn outline" to="/signup">회원가입</Link></div></div></section>;
}
