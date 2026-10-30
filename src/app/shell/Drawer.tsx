/* 드로어(오른쪽 패널): 관심·내 투자·최근 본·용어 풀이·AI 질문. 목업 gops.js 380~505줄, 1698~1718줄, 3151~3156줄, 크기 조절 3498~3522줄 */
import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ic, type IconName } from "../icons";
import { pct, tone, useCurrency, useFormat } from "../format";
import { prefs, type DwTab } from "../store";
import { useSession } from "../session";
import { Mark } from "./Mark";
import { useSymbolMap } from "./useSymbolMap";
import { useWatchlist } from "../../data/hooks/useWatchlist";
import { useAccount } from "../../data/hooks/useAccount";
import { useRecent } from "../../data/hooks/useRecent";
import { useDataSource } from "../../data/source";
import { groupRecentByDay } from "../../data/api/mappers";
import { EmptyState, ErrorState, SkeletonRows } from "./LoadState";
import { WATCH_AI_LINE, RECENT_TODAY, RECENT_YESTERDAY } from "../../data/mock/user";
import { Thread } from "./Thread";
import { DrawerLearn } from "./learn/DrawerLearn";
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

/* 가격은 종목 마스터(api 모드는 S&P 500 heatmap)에서 찾는다. 마스터에 없으면 이름표만 */
function DwRow({ sym, extra = "", nameKo }: { sym: string; extra?: string; nameKo?: string | null }) {
  const syms = useSymbolMap(); const fmt = useFormat();
  const st = syms[sym];
  if (!st) return <Link className="wrow" to={`/stock?s=${sym}`}><span className="sym"><Mark symbol={sym} /></span><span className="nm"><b>{nameKo || sym}</b><small>{sym}{extra}</small></span><span className="pr"></span></Link>;
  const d = st.price - st.price / (1 + st.changePercent / 100);
  return <Link className="wrow" to={`/stock?s=${sym}`}><span className="sym"><Mark symbol={sym} color={st.color} /></span><span className="nm"><b>{st.nameKo || nameKo || sym}</b><small>{sym}{extra}</small></span>
    {st.price > 0 ? <span className="pr"><b>{fmt.usd(st.price)}</b><small className={tone(st.changePercent)}>{st.changePercent >= 0 ? "+" : "-"}{fmt.usd(Math.abs(d))} ({pct(st.changePercent)})</small></span> : <span className="pr"></span>}</Link>;
}

function DrawerOther({ tab, act }: { tab: DwTab; act: Actions }) {
  const fmt = useFormat();
  const watch = useWatchlist();
  const { summary } = useAccount();
  const recent = useRecent();
  const mock = useDataSource().kind === "mock";
  if (tab === "watch") {
    const list = watch.data?.symbols ?? [];
    const addRow = <button className="addrow" onClick={act.focusSearch}><span className="plus"><Ic name="plus" /></span>종목 검색해서 추가하기</button>;
    return <><Head title="관심" /><div className="dw-body">
      {mock ? <button className="ai-line" onClick={act.openAi}><span className="ai-lbl"><Ic name="spark" /> GOPS AI</span><span className="ai-txt">{WATCH_AI_LINE}</span><Ic name="chevR" /></button> : null}
      {watch.error && !watch.data ? <ErrorState title="관심 종목을 불러오지 못했어요" onRetry={watch.reload} minHeight={200} />
        : watch.loading && !watch.data ? <SkeletonRows n={4} />
        : !list.length ? <><EmptyState icon="heart" title="관심 종목이 아직 없어요" body="종목 화면에서 별표를 누르면 여기에 모여요." minHeight={200} />{addRow}</>
        : <><div className="dw-sub"><b>관심 종목</b><small>{list.length}개, 별표로 추가한 순서</small></div>
          {list.map(sym => <div key={sym} className="wrow-wrap"><DwRow sym={sym} /><button className="heart on" onClick={() => act.unwatch(sym)} aria-label={`${sym} 관심 해제`}><Ic name="heartFill" /></button></div>)}
          {addRow}</>}
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
  const head = <Head title="최근 본" />;
  if (recent.error && !recent.data) return <>{head}<div className="dw-body"><ErrorState title="최근 본 종목을 불러오지 못했어요" onRetry={recent.reload} minHeight={200} /></div></>;
  if (recent.loading && !recent.data) return <>{head}<div className="dw-body"><SkeletonRows n={4} /></div></>;
  const all = recent.data?.items ?? [];
  if (!all.length) return <>{head}<div className="dw-body"><EmptyState icon="clock" title="최근 본 종목이 없어요" body="종목 화면을 열면 여기에 순서대로 남아요." minHeight={200} /></div></>;
  /* 목업은 오늘·어제 목록이 정해져 있다. api 모드는 서버가 준 viewedAt 날짜로 나눈다 */
  const groups: [string, { symbol: string; nameKo: string | null }[]][] = mock
    ? [["오늘", RECENT_TODAY.filter(s => all.some(i => i.symbol === s)).map(s => ({ symbol: s, nameKo: null }))], ["어제", RECENT_YESTERDAY.filter(s => all.some(i => i.symbol === s)).map(s => ({ symbol: s, nameKo: null }))]]
    : (() => { const g = groupRecentByDay(all, new Date()); return [["오늘", g.today], ["어제", g.yesterday], ["그 전", g.earlier]] as [string, typeof all][]; })();
  return <>{head}<div className="dw-body">
    {groups.filter(([, l]) => mock || l.length).map(([t, l], i) => <Fragment key={t}><div className="dw-sub"><b>{t}</b>{i === 0 ? <small>본 순서대로</small> : null}</div>
      {l.map(r => <DwRow key={r.symbol} sym={r.symbol} nameKo={r.nameKo} />)}</Fragment>)}
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
