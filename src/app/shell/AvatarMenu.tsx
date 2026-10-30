/* 내 계정 메뉴. 목업 gops.js 3164~3171줄 renderMe */
import { useLayoutEffect, useState } from "react";
import { Ic } from "../icons";
import { useSession } from "../session";
import { useProgress } from "../../data/hooks/useProgress";
import { useProfile } from "../../data/hooks/useProfile";
import type { Actions } from "./actions";

export function AvatarButton({ act }: { act: Actions }) {
  const { initials } = useSession();
  return <button className="avatar" data-act="me" onClick={act.me} aria-label="내 계정">{initials}</button>;
}

export function AvatarMenu({ act }: { act: Actions }) {
  const { guest, initials } = useSession();
  const open = act.q("me") === "1" && !guest;
  const { data: prog } = useProgress();
  const { data: profile } = useProfile();
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => { const b = document.querySelector('[data-act="me"]')?.getBoundingClientRect(); if (b) setPos({ top: Math.round(b.bottom + 8), right: Math.round(window.innerWidth - b.right) }); };
    place(); window.addEventListener("resize", place); return () => window.removeEventListener("resize", place);
  }, [open]);
  if (!open || !pos) return <div id="memenu" />;
  return <div id="memenu"><div className="menu" style={{ position: "fixed", top: pos.top, right: pos.right, width: 260, padding: 6, zIndex: 60 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 10px 12px" }}><span className="avatar" style={{ margin: 0 }}>{initials}</span><span><b style={{ display: "block", fontWeight: 600 }}>{profile?.name ?? "승리"}</b><span className="t-caption">{profile?.email ?? ""}</span></span></div>
    <hr /><button onClick={() => act.go("/portfolio")}><Ic name="wallet16" />내 계좌</button><button onClick={() => act.go("/course")}><Ic name="chart" />실전 차트 문제 풀기<small className="me-n">{prog ? `${prog.solved.length}/${prog.total}` : ""}</small></button><button onClick={() => act.set("dialog", "profile")}><Ic name="list" />투자 경험 수정</button><button><Ic name="grid16" />계정 설정</button>
    <hr /><button className="danger" onClick={act.logout}>로그아웃</button></div></div>;
}
