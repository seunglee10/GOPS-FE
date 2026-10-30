/* 오른쪽 레일. 목업 gops.js 375~379줄 */
import { Ic, type IconName } from "../icons";
import type { DwTab } from "../store";
import type { Actions } from "./actions";

export const RAIL: [DwTab, string, IconName][] = [["ai", "AI 질문", "spark"], ["watch", "관심", "heart"], ["hold", "내 투자", "wallet"], ["recent", "최근 본", "clock"], ["learn", "용어 풀이", "book"]];

export function Rail({ act }: { act: Actions }) {
  const tab = act.dw();
  return (
    <nav className="rail" id="rail" aria-label="오른쪽 패널">
      <button className="rail-fold" onClick={act.railFold} aria-label={tab ? "패널 접기" : "패널 펼치기"}><Ic name={tab ? "foldR" : "foldL"} /></button>
      {RAIL.map(([k, t, i]) => <button key={k} className="rail-it" onClick={() => act.rail(k)} aria-pressed={tab === k}><span className="ri"><Ic name={i} /></span><span>{t}</span></button>)}
    </nav>
  );
}
