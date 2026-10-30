/* 증시 캘린더. 목업 gops.js pageCalendar(794~843). ?ct=econ|earn, ?cr=kr|us, ?cv=m(월별), ?cd=날짜 */
import { useEffect, useState } from "react";
import type { CalendarItem, CalendarKind, CalendarRegion } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { LetterMark, Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { useCalendar } from "../../data/hooks";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
/* 로고가 없는 국내 회사 색 (목업 760줄) */
const KR_MARK: Record<string, string> = { 삼성전자: "#1428A0", 삼성바이오로직스: "#1428A0", 삼성물산: "#1428A0", SK하이닉스: "#EA002C" };
const p2 = (v: number) => String(v).padStart(2, "0");

export default function CalendarPage() {
  usePage("calendar");
  const act = useActions("calendar");
  const syms = useSymbolMap();
  const ctq = act.q("ct"), crq = act.q("cr");
  const ct = ctq === "econ" || ctq === "earn" ? (ctq as CalendarKind) : "", cr = crq === "kr" || crq === "us" ? (crq as CalendarRegion) : "";
  const monthly = act.q("cv") === "m";
  /* 보는 달: 처음엔 이 기기의 이번 달로 묻고, 서버가 알려 준 오늘(today)이 다른 달이면 그 달로 다시 묻는다 (목업은 2026년 10월 고정) */
  const [ym, setYm] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}`; });
  const Y = +ym.slice(0, 4), M = +ym.slice(5, 7), last = new Date(Y, M, 0).getDate();
  const { events, brief } = useCalendar({ from: `${ym}-01`, to: `${ym}-${p2(last)}`, kind: ct || undefined, region: cr || undefined });
  const today = events.data?.today ?? null;
  useEffect(() => { if (today && today.slice(0, 7) !== ym) setYm(today.slice(0, 7)); }, [today, ym]);
  const TODAY = today && today.slice(0, 7) === ym ? +today.slice(8, 10) : 0;
  const ev = events.data?.items ?? [];
  const sel = Math.min(last, Math.max(1, +(act.q("cd") || 0) || TODAY || 1));
  const on = (d: number) => ev.filter(e => +e.date.slice(8, 10) === d);
  const dt = (d: number) => new Date(Y, M - 1, d), dow = (d: number) => dt(d).getDay();
  /* 달력은 월요일부터 토요일까지. 일요일은 증시가 쉬어서 뺀다 */
  const first = dt(1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const weeks: Date[] = []; for (const w = new Date(start); w <= dt(last); w.setDate(w.getDate() + 7)) weeks.push(new Date(w));
  const days = (w: Date) => [0, 1, 2, 3, 4, 5].map(i => { const x = new Date(w); x.setDate(w.getDate() + i); return x; });
  const inM = (x: Date) => x.getMonth() === M - 1;
  const selMon = weeks.findIndex(w => days(w).some(x => inM(x) && x.getDate() === sel));
  const wkName = (w: Date) => `${w.getMonth() + 1}월 ${Math.ceil(w.getDate() / 7)}주차`;
  const seg = (k: string, cur: string, opts: [string, string][]) => <div className="seg">{opts.map(([v, t]) => <button key={v} aria-pressed={cur === v} onClick={() => act.set(k, v)}>{t}</button>)}</div>;
  const icon = (e: CalendarItem) => {
    if (!e.symbol) return <span className="cal-ic flag">{e.region === "kr" ? "🇰🇷" : "🇺🇸"}</span>;
    const m = KR_MARK[e.symbol] ? <LetterMark letter={e.symbol[0]} color={KR_MARK[e.symbol]} /> : <Mark symbol={e.symbol} color={syms[e.symbol]?.color} />;
    return <span className="cal-ic">{m}{e.region === "us" ? <span className="cal-fl">🇺🇸</span> : null}</span>;
  };
  const res = (e: CalendarItem) => [e.actual, e.forecast, e.previous];
  const row = (e: CalendarItem, firstOfDay: boolean) => { const d = +e.date.slice(8, 10);
    return <div key={e.id} className="cal-row"><span className={`cal-d ${firstOfDay && d === TODAY ? "today" : ""}`}>{firstOfDay ? `${d}일 (${DOW[dow(d)]})` : ""}</span>
      <span className="cal-t">{icon(e)}<span className="nm">{e.title}</span>{e.level ? <span className="cal-lv">{e.level}</span> : null}{e.call ? <span className="cal-call"><i></i>어닝콜 예정</span> : null}</span>
      {res(e).some(Boolean) ? res(e).map((v, i) => <span key={i} className="cal-num">{v}</span>) : <span className="cal-at">{e.at || e.done || ""}</span>}</div>; };
  const weekBlock = (w: Date) => {
    const ds = days(w).filter(inM).map(x => x.getDate());
    const rows = ds.flatMap(d => { const l = on(d); return l.length ? l.map((e, i) => row(e, !i)) : d === TODAY ? [<div key={`t${d}`} className="cal-row"><span className="cal-d today">{d}일 ({DOW[dow(d)]})</span><span className="cal-t muted"><span className="cal-ic flag"><Ic name="list" /></span>소식이 없어요</span></div>] : []; });
    return <section key={w.toDateString()} className="cal-wk"><h3>{wkName(w)}</h3><div className="cal-tbl"><div className="cal-row cal-hd"><span>날짜</span><span>일정</span><span className="cal-num">발표</span><span className="cal-num">예상</span><span className="cal-num">이전</span></div>
      {rows.length ? rows : <div className="cal-row"><span></span><span className="cal-t muted">이 주에는 일정이 없어요</span></div>}</div></section>;
  };
  const monthGrid = <div className="cal-month"><div className="cal-mh">{DOW.slice(1).map(d => <span key={d}>{d}</span>)}</div>
    {weeks.map(w => <div key={w.toDateString()} className="cal-mw">{days(w).map(x => { const d = x.getDate(), l = inM(x) ? on(d) : [];
      return <div key={x.toDateString()} className={`cal-mc ${inM(x) ? "" : "out"}`}><span className={`cal-md ${inM(x) && d === TODAY ? "today" : ""}`}>{d}</span>{l.slice(0, 3).map(e => <span key={e.id} className="cal-me">{icon(e)}<span>{e.title}</span></span>)}{l.length > 3 ? <button className="cal-more" onClick={() => act.set("cv", "", { cd: String(d) })}>{l.length - 3}개 더</button> : null}</div>; })}</div>)}</div>;
  return <div className="calpage">
    <aside className="cal-side">
      <div className="cal-mini">
        <div className="cal-mini-h"><b>{Y}년 {M}월</b><span className="spacer"></span><button className="iconbtn sm" aria-label="이전 달" disabled><Ic name="chevL" /></button><button className="iconbtn sm" aria-label="다음 달" disabled><Ic name="chevR" /></button></div>
        <div className="cal-mini-g">{DOW.slice(1).map(d => <span key={d} className="dw">{d}</span>)}
          {weeks.map((w, wi) => <div key={wi} className={`cal-mini-w ${wi === selMon && !monthly ? "sel" : ""}`}>{days(w).map(x => { const d = x.getDate(), has = inM(x) && on(d).length;
            return inM(x) ? <button key={d} className={`${has ? "" : "empty"} ${d === sel ? "on" : ""}`} onClick={() => act.set("cd", d === TODAY ? "" : d)}>{d}</button> : <span key={"o" + d} className="out">{d}</span>; })}</div>)}</div>
      </div>
      <div className="cal-ai"><span className="cal-ai-l"><Ic name="spark" />이번주 AI 요약</span><p>{brief.data?.text ?? ""}</p><button className="linkbtn" onClick={act.openAi}>자세히 보기<Ic name="chevR" /></button></div>
    </aside>
    <div className="cal-main">
      <h2>증시캘린더</h2>
      <div className="cal-bar">{seg("ct", ct, [["", "전체"], ["econ", "경제지표"], ["earn", "실적"]])}{seg("cr", cr, [["", "전체"], ["kr", "국내"], ["us", "해외"]])}<span className="spacer"></span>{seg("cv", monthly ? "m" : "", [["", "주별"], ["m", "월별"]])}</div>
      {monthly ? monthGrid : weeks.slice(Math.max(0, selMon)).map(weekBlock)}
      <p className="cal-note">한국 시간 기준이에요. 실적 발표 시각은 회사 사정에 따라 바뀔 수 있어요.</p>
    </div>
  </div>;
}
