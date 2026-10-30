/* 드로어(오른쪽 패널): 관심·내 투자·최근 본·용어 풀이·AI 질문. 목업 gops.js 380~505줄, 1698~1718줄, 3151~3156줄, 크기 조절 3498~3522줄 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Ic, type IconName } from "../icons";
import { pct, tone, useCurrency, useFormat } from "../format";
import { prefs, type DwTab } from "../store";
import { useSession } from "../session";
import { Mark } from "./Mark";
import { useSymbolMap } from "./useSymbolMap";
import { useWatchlist } from "../../data/hooks/useWatchlist";
import { useAccount } from "../../data/hooks/useAccount";
import { useRecent } from "../../data/hooks/useRecent";
import { TERM_NAME } from "../../data/terms";
import { WATCH_AI_LINE, RECENT_TODAY, RECENT_YESTERDAY } from "../../data/mock/user";
import { Thread } from "./Thread";
import { hlTopic, topicCount, useTopicHover } from "../topics";
import { DrawerTerm } from "../../pages/Stock/TermCard";
import type { Actions } from "./actions";
import type { PageKey } from "../nav";

export function Drawer({ page, act }: { page: PageKey; act: Actions }) {
  const tab = act.dw();
  const { guest } = useSession();
  const el = useRef<HTMLElement>(null);
  const w = prefs.dwW.get();
  /* 패널 너비를 본문 밀어내기(--dw-push)에 반영. 용어 풀이 패널은 화면 위에 덮지 않고 옆으로 밀어서 화면의 용어 표시를 볼 수 있게 한다 */
  useEffect(() => {
    document.body.classList.toggle("dw-push", !!tab);
    if (!tab || !el.current) return;
    const set = () => { if (el.current) document.body.style.setProperty("--dw-push", el.current.getBoundingClientRect().width + "px"); };
    set(); const ro = new ResizeObserver(set); ro.observe(el.current); return () => ro.disconnect();
  }, [tab]);
  if (!tab) return <aside id="thread" />;
  return (
    <aside id="thread" ref={el} className="thread drawer" style={w > 0 ? { width: w } : undefined}>
      <Resizer target={el} />
      {guest ? <GuestPanel tab={tab} /> : tab === "learn" ? <DrawerLearn page={page} act={act} /> : tab === "ai" ? <Thread page={page} act={act} /> : <DrawerOther tab={tab} act={act} />}
    </aside>
  );
}

/* 왼쪽 가장자리를 끌어 너비를 바꾼다. 끄는 동안에도 본문 자리를 같이 맞춰서 사이드바가 본문을 덮는 순간 없이 바로 밀리게 한다 */
function Resizer({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const onDown = (e: React.PointerEvent) => {
    const el = target.current; if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(), x0 = e.clientX, maxW = Math.min(760, window.innerWidth - 120);
    document.body.classList.add("resizing");
    const push = document.body.classList.contains("dw-push");
    const move = (ev: PointerEvent) => { const w = Math.min(maxW, Math.max(320, r.width + (x0 - ev.clientX))); el.style.width = w + "px"; if (push) document.body.style.setProperty("--dw-push", w + "px"); };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.body.classList.remove("resizing"); prefs.dwW.set(el.getBoundingClientRect().width); if (push) document.body.style.setProperty("--dw-push", el.getBoundingClientRect().width + "px"); };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  };
  return <span className="rz rz-l" data-rz="l" aria-hidden="true" onPointerDown={onDown}></span>;
}

export function CurSeg() {
  const { krwMode, setCur } = useCurrency();
  return <div className="seg sm cur-seg" role="group" aria-label="통화"><button aria-pressed={krwMode} onClick={() => setCur("")} aria-label="원화로 보기">₩</button><button aria-pressed={!krwMode} onClick={() => setCur("usd")} aria-label="달러로 보기">$</button></div>;
}
const Head = ({ title, cur = true }: { title: string; cur?: boolean }) => <div className="dw-head"><b>{title}</b><span className="spacer"></span>{cur ? <CurSeg /> : null}</div>;

function DwRow({ sym, extra = "" }: { sym: string; extra?: string }) {
  const syms = useSymbolMap(); const fmt = useFormat();
  const st = syms[sym]; if (!st) return null;
  const d = st.price - st.price / (1 + st.changePercent / 100);
  return <Link className="wrow" to={`/stock?s=${sym}`}><span className="sym"><Mark symbol={sym} color={st.color} /></span><span className="nm"><b>{st.nameKo}</b><small>{sym}{extra}</small></span>
    <span className="pr"><b>{fmt.usd(st.price)}</b><small className={tone(st.changePercent)}>{st.changePercent >= 0 ? "+" : "-"}{fmt.usd(Math.abs(d))} ({pct(st.changePercent)})</small></span></Link>;
}

function DrawerOther({ tab, act }: { tab: DwTab; act: Actions }) {
  const fmt = useFormat();
  const watch = useWatchlist();
  const { summary } = useAccount();
  const recent = useRecent();
  if (tab === "watch") {
    const list = watch.data?.symbols ?? [];
    return <><Head title="관심" /><div className="dw-body">
      <button className="ai-line" onClick={act.openAi}><span className="ai-lbl"><Ic name="spark" /> GOPS AI</span><span className="ai-txt">{WATCH_AI_LINE}</span><Ic name="chevR" /></button>
      <div className="dw-sub"><b>관심 종목</b><small>{list.length}개, 별표로 추가한 순서</small></div>
      {list.map(sym => <div key={sym} className="wrow-wrap"><DwRow sym={sym} /><button className="heart on" onClick={() => act.unwatch(sym)} aria-label={`${sym} 관심 해제`}><Ic name="heartFill" /></button></div>)}
      <button className="addrow" onClick={act.focusSearch}><span className="plus"><Ic name="plus" /></span>종목 검색해서 추가하기</button>
    </div></>;
  }
  if (tab === "hold") {
    const a = summary.data;
    return <><Head title="내 투자" /><div className="dw-body">
      {a ? <div className="dw-sum"><small>총 평가 금액</small><b>{fmt.usd(a.totalValue)}</b><span className="up">오늘 +{fmt.usd(a.todayPnl)} (+{a.todayReturnPercent.toFixed(2)}%)</span></div> : null}
      <div className="dw-sub"><b>보유 종목</b><small>{a?.holdings.length ?? 0}개</small></div>
      {(a?.holdings ?? []).map(h => <DwRow key={h.symbol} sym={h.symbol} extra={`, ${h.qty}주`} />)}
      <Link className="addrow" to="/portfolio"><span className="plus"><Ic name="chevR" /></span>자산 화면에서 자세히 보기</Link>
    </div></>;
  }
  const items = recent.data?.items.map(i => i.symbol) ?? [];
  const today = RECENT_TODAY.filter(s => items.includes(s)), yesterday = RECENT_YESTERDAY.filter(s => items.includes(s));
  return <><Head title="최근 본" /><div className="dw-body">
    <div className="dw-sub"><b>오늘</b><small>본 순서대로</small></div>
    {today.map(sym => <DwRow key={sym} sym={sym} />)}
    <div className="dw-sub"><b>어제</b></div>
    {yesterday.map(sym => <DwRow key={sym} sym={sym} />)}
  </div></>;
}

/* 사이드바 '용어 풀이': 사전 하나만 맡는다 (목업 drawerLearn 1698). 지금 화면에 나온 용어를 먼저, 마우스를 올리면 화면에 테두리.
   고른 용어의 카드 본문은 종목 화면의 용어 카드(DrawerTerm)와 같다 */
function DrawerLearn({ page, act }: { page: PageKey; act: Actions }) {
  const lterm = act.q("lterm");
  const [cnt, setCnt] = useState<Record<string, number>>({});
  const { search } = useLocation();
  useTopicHover(lterm);
  /* 화면이 다 그려진 뒤에 센다 (목업도 다음 프레임에 다시 그렸다) */
  useEffect(() => {
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => {
      setCnt(Object.fromEntries(Object.keys(TERM_NAME).map(t => [t, topicCount(t)])));
      hlTopic(lterm);
    }); });
    return () => cancelAnimationFrame(raf);
  }, [lterm, search]);
  useEffect(() => () => hlTopic(null), []);
  if (lterm && TERM_NAME[lterm]) {
    const s = page === "stock" ? (act.q("s") || "NVDA").toUpperCase() : "NVDA";
    return <DrawerTerm s={s} lterm={lterm} here={cnt[lterm] ?? 0} notStock={page !== "stock"} onBack={() => act.set("lterm", "")} />;
  }
  const all = Object.keys(TERM_NAME), ctx = all.filter(t => cnt[t] > 0), rest = all.filter(t => !cnt[t]);
  const row = (t: string) => <button key={t} className="lp-row" data-topic={t} onClick={() => act.set("lterm", t)}><span className="t">{TERM_NAME[t]}{cnt[t] ? <small>화면에 {cnt[t]}곳</small> : null}</span><Ic name="chevR" /></button>;
  return <><div className="dw-head"><b>용어 풀이</b><span className="spacer"></span></div>
    <div className="dw-body">
      {ctx.length ? <><div className="dw-sub"><b>이 화면에 나온 용어</b><small>마우스를 올리면 화면에 표시돼요</small></div>{ctx.map(row)}</> : null}
      <div className="dw-sub"><b>{ctx.length ? "다른 용어" : "전체 용어"}</b></div>{rest.map(row)}
    </div></>;
}

function GuestState({ icon, title, body }: { icon: IconName; title: string; body: ReactNode }) {
  return <div className="state"><span className="ic"><Ic name={icon} /></span><h3>{title}</h3><p>{body}</p>
    <div className="actions"><Link className="btn primary" to="/login">로그인</Link><Link className="btn outline" to="/signup">회원가입</Link></div></div>;
}
const GUEST: Record<DwTab, [string, IconName, string, string]> = {
  ai: ["AI 질문", "spark", "로그인하고 물어보세요", "지금 보는 화면을 함께 보고 답해요. 대화는 계정에 저장돼서 다른 기기에서도 이어져요."],
  watch: ["관심", "heart", "관심 종목을 모아 보세요", "로그인하면 별표로 고른 종목의 시세와 AI 한 줄 요약을 여기서 봐요."],
  hold: ["내 투자", "wallet", "모의투자 계좌가 여기 보여요", "가입하면 $10,000 모의투자 계좌가 바로 열려요. 실제 돈은 쓰지 않아요."],
  recent: ["최근 본", "clock", "최근 본 종목이 여기 모여요", "로그인하면 기기를 바꿔도 최근 본 종목이 이어져요."],
  learn: ["용어 풀이", "book", "로그인하고 물어보세요", "지금 보는 화면을 함께 보고 답해요. 대화는 계정에 저장돼서 다른 기기에서도 이어져요."],
};
export function GuestPanel({ tab }: { tab: DwTab }) {
  const t = GUEST[tab];
  return <><div className="dw-head"><b>{t[0]}</b></div><div className="dw-body" style={{ display: "flex" }}><GuestState icon={t[1]} title={t[2]} body={t[3]} /></div></>;
}
