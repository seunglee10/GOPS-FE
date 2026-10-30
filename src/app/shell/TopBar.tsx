/* 상단바. 목업 gops.js 243~262줄 */
import { Link } from "react-router-dom";
import { Ic } from "../icons";
import { NAV, type PageKey } from "../nav";
import { useSession } from "../session";
import { HeaderSearch } from "./HeaderSearch";
import { BellButton } from "./Bell";
import { AvatarButton } from "./AvatarMenu";
import type { Actions } from "./actions";

export function TopBar({ page, act }: { page: PageKey; act: Actions }) {
  const { guest } = useSession();
  return (
    <header className="topnav">
      <div className="row1">
        <Link className="wordmark" to="/"><Ic name="logo" />GOPS</Link>
        <nav className="tabnav" aria-label="주요 화면">{NAV.map(([k, t, h]) => <Link key={k} to={h} aria-current={page === k ? "page" : undefined}>{t}</Link>)}</nav>
        <div className="nav-right">
          <HeaderSearch act={act} />
          {guest ? <><Link className="btn sm ghost" to="/login">로그인</Link><Link className="btn sm primary" to="/signup">회원가입</Link></>
            : <><BellButton act={act} /><AvatarButton act={act} /></>}
        </div>
      </div>
    </header>
  );
}
