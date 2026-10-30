/* 목록을 읽는 동안·실패했을 때·비었을 때 보여 주는 작은 조각. 드로어·검색·뉴스가 같이 쓴다 */
import type { ReactNode } from "react";
import { Ic, type IconName } from "../icons";

/** 읽는 중: 줄 모양 스켈레톤 */
export function SkeletonRows({ n = 3, h = 44 }: { n?: number; h?: number }) {
  return <div className="sk-rows" aria-busy="true" aria-label="불러오는 중">{Array.from({ length: n }, (_, i) => <div key={i} className="sk" style={{ height: h, margin: "6px 0" }} />)}</div>;
}

/** 실패: 짧은 문장 + 다시 시도 */
export function ErrorState({ title, onRetry, minHeight }: { title: string; onRetry: () => void; minHeight?: number }) {
  return <div className="state error" role="alert" style={minHeight != null ? { minHeight } : undefined}><span className="ic"><Ic name="warn" /></span><h3>{title}</h3>
    <div className="actions"><button className="btn sm outline" onClick={onRetry}>다시 시도</button></div></div>;
}

/** 비었음 */
export function EmptyState({ icon, title, body, children, minHeight }: { icon?: IconName; title: string; body?: ReactNode; children?: ReactNode; minHeight?: number }) {
  return <div className="state" style={minHeight != null ? { minHeight } : undefined}>{icon ? <span className="ic"><Ic name={icon} /></span> : null}<h3>{title}</h3>{body ? <p>{body}</p> : null}
    {children ? <div className="actions">{children}</div> : null}</div>;
}
