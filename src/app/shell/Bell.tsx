/* 알림함. 목업 gops.js 506~515줄. 버튼 위치를 재서 그 아래에 메뉴를 띄운다 */
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../icons";
import { useFormat } from "../format";
import { useNotifications } from "../../data/hooks/useNotifications";
import type { Actions } from "./actions";

export function BellButton({ act }: { act: Actions }) {
  const { data } = useNotifications();
  const n = data?.unreadCount ?? 0;
  return <button className="svc" data-act="bell" onClick={act.bell} aria-label="알림함" aria-pressed={act.q("bell") === "1"}><Ic name="bell16" /><span className="lbl">알림</span>{n ? <span className="n">{n}</span> : null}</button>;
}

export function BellMenu({ act }: { act: Actions }) {
  const open = act.q("bell") === "1";
  const { data, readAll } = useNotifications();
  const fmt = useFormat();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => { const b = document.querySelector('[data-act="bell"]')?.getBoundingClientRect(); if (b) setPos({ top: Math.round(b.bottom + 8), left: Math.round(Math.max(8, Math.min(b.right - 340, window.innerWidth - 348))) }); };
    place(); window.addEventListener("resize", place); return () => window.removeEventListener("resize", place);
  }, [open]);
  if (!open || !pos) return <div id="bellmenu" />;
  return <div id="bellmenu"><div className="menu" style={{ position: "fixed", top: pos.top, left: pos.left, width: 340, padding: 6, zIndex: 60 }}>
    <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 8px" }}><b style={{ fontWeight: 500 }}>알림</b><span className="spacer" style={{ flex: 1 }}></span><button className="btn sm ghost" onClick={() => void readAll.run()}>모두 읽음</button></div>
    {(data?.items ?? []).map((it, i) => <Link key={it.id} to={it.href} style={{ display: "block", padding: "9px 8px", borderRadius: "var(--radius-s)", ...(i < 2 ? { background: "var(--control)", marginBottom: 2 } : {}) }}><span style={{ display: "block", fontSize: 14 }}>{it.titleKo}</span><span className="t-caption">{fmt.t(it.metaKo)}</span></Link>)}
    <hr /><button onClick={() => act.go("/portfolio?tab=rules")}><Ic name="list" /> 규칙 관리</button></div></div>;
}
