/* 여러 화면이 같이 쓰는 작은 조각. 목업 gops.js 의 ptitle(648), guestState/guestPage(3147~3162) */
import { Link } from "react-router-dom";
import { Ic, type IconName } from "../../app/icons";
import { useFormat } from "../../app/format";

/* 패널 제목: 주소가 있으면 > 가 붙은 링크, 없으면 이름표 */
export function Ptitle({ t, href }: { t: string; href?: string | null }) {
  return href ? <Link className="ptitle" to={href}>{t}<Ic name="chevR" /></Link> : <span className="t-label">{t}</span>;
}

export { Svg } from "../../app/Svg";

export function GuestState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return <div className="state"><span className="ic"><Ic name={icon} /></span><h3>{title}</h3><p>{body}</p>
    <div className="actions"><Link className="btn primary" to="/login">로그인</Link><Link className="btn outline" to="/signup">회원가입</Link></div></div>;
}

/* 로그아웃 상태의 내 계좌·투자 복기 */
export function GuestPage({ coach }: { coach?: boolean }) {
  const fmt = useFormat();
  return <section className="panel" style={{ minHeight: "100%" }}>
    <GuestState icon={coach ? "list" : "wallet"}
      title={coach ? "로그인하면 내 거래를 복기해 드려요" : "로그인하면 내 자산을 볼 수 있어요"}
      body={fmt.t(coach ? "장 마감 뒤 주문마다 판단과 결과를 나눠 보여 줘요. 가입하면 모의투자 계좌가 바로 열려요." : "보유 종목, 주문 내역, 규칙, 관심 종목을 한곳에서 관리해요. 가입하면 $10,000 모의투자 계좌가 바로 열려요.")} />
  </section>;
}
