/* 투자 복기. 목업 gops.js pageCoach(2956~3090). 가드레일 스위치는 ?g1=0, ?g3=1, ?g4=1 로도 정할 수 있다.
   체크리스트를 몇 개 채웠는지 같은 점수는 넣지 않고, 돈과 이어지는 지표만 보여 준다 */
import { useNavigate } from "react-router-dom";
import type { Guardrails, ReviewTrade } from "../../api/types";
import { usePage } from "../../app/shell/Shell";
import { useActions, type Actions } from "../../app/shell/actions";
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Mark } from "../../app/shell/Mark";
import { Ic } from "../../app/icons";
import { pct, tone, useFormat } from "../../app/format";
import { useGuardrails, useReview } from "../../data/hooks";
import { GuestPage } from "../_shared";

const MONTH = "2026-09";

export default function CoachPage() {
  usePage("coach");
  const act = useActions("coach");
  if (act.guest) return <GuestPage coach />;
  return <Coach act={act} />;
}

function Coach({ act }: { act: Actions }) {
  const fmt = useFormat();
  const syms = useSymbolMap();
  const navigate = useNavigate();
  const { data } = useReview(MONTH);
  const guard = useGuardrails();
  if (!data) return <div className="coach-wrap rv" />;
  const T = data.trades, AUG = data.prevMonth, mon = +data.month.slice(5, 7), nextMon = mon % 12 + 1;
  const ko = (k: string) => syms[k]?.nameKo ?? k;
  const usd = fmt.usd;
  const sum = (a: ReviewTrade[]) => a.reduce((t, x) => t + x.pnl, 0);
  const wins = T.filter(t => t.pnl > 0), losses = T.filter(t => t.pnl < 0);
  const total = data.kpi.realizedPnl, winRate = data.kpi.winRate;
  const avgWin = sum(wins) / (wins.length || 1), avgLoss = -sum(losses) / (losses.length || 1), ratio = data.kpi.avgWinLossRatio;
  const isMistake = (t: ReviewTrade) => t.habit === "chase" || t.habit === "avg";
  const mistakes = T.filter(isMistake), mistakePnl = data.kpi.mistakePnl;
  const gap = data.kpi.returnPercent - data.benchmark.spxReturnPercent;
  const sgn = (v: number, d = 2) => (v >= 0 ? "+" : "-") + usd(Math.abs(v), d);
  // 지난달 대비 변화. 숫자가 커지면 빨강 ↑, 작아지면 파랑 ↓ (국내 증권 관례)
  const delta = (v: number, f: (x: number) => string) => <span className={`rv-pill ${tone(v)}`}>{v >= 0 ? "↑" : "↓"} {f(Math.abs(v))}</span>;
  const pp = (x: number) => x.toFixed(0) + "%p", money = (x: number) => usd(x, 0);

  // 습관별 손익: 한 달 손익이 어디서 났는지
  const H = data.byHabit.map(h => ({ key: h.habit, name: h.labelKo, n: h.count, w: h.wins, pnl: h.pnl, missed: h.missedProfit }));
  let run = 0;
  const steps = H.map(g => { const from = run; run += g.pnl; return { ...g, from, to: run }; });
  const top = Math.max(...steps.map(s => Math.max(s.from, s.to)), total) * 1.12;
  const yp = (v: number) => v / top * 100;
  const best = steps[0], worst = [...steps].sort((a, b) => a.pnl - b.pnl)[0];
  const chase = H.find(h => h.key === "chase"), avgDown = H.find(h => h.key === "avg"), rush = H.find(h => h.key === "rush");
  const rushName = ko(T.find(t => t.habit === "rush")?.symbol ?? "");

  // 주문을 수익률 순으로. 위아래로 수익률 글자가 들어갈 여유를 둔다
  const byRet = [...T].sort((a, b) => b.returnPercent - a.returnPercent);
  const rHi = Math.max(...T.map(t => t.returnPercent)) * 1.15, rLo = Math.min(...T.map(t => t.returnPercent)) * 1.6;
  const span = rHi - rLo, z = -rLo / span * 100;
  const lossInMistake = losses.filter(isMistake).length;

  // 판 주문: 판 뒤 지금까지 주가가 어떻게 움직였나
  const sells = T.filter(t => t.side === "sell").map(t => ({ ...t, after: (t.now / t.price - 1) * 100 }));
  const rose = sells.filter(t => t.after > 5), missedSum = rose.reduce((a, t) => a + t.missedProfit, 0);

  // 종목별 손익: 한 종목에 얼마나 기댔나
  const byStock = Object.values(T.reduce<Record<string, { k: string; n: number; pnl: number }>>((m, t) => { (m[t.symbol] ||= { k: t.symbol, n: 0, pnl: 0 }); m[t.symbol].n++; m[t.symbol].pnl += t.pnl; return m; }, {})).sort((p, q) => q.pnl - p.pnl);
  const maxAbs = Math.max(...byStock.map(x => Math.abs(x.pnl))), lead = byStock[0];

  // 복기 꼬리표는 주문 습관으로 정한다: 계획한 주문은 결과와 상관없이 잘한 거래
  const tagOf = (t: ReviewTrade): [string, string] => t.habit === "plan" || t.habit === "exit" ? (t.pnl >= 0 ? ["ok", "잘한 거래"] : ["", "계획대로 손절"])
    : isMistake(t) ? ["caution", "돌아볼 거래"] : t.pnl >= 0 ? ["", "운이 좋았어요"] : ["caution", "돌아볼 거래"];

  /* 가드레일: 주소(?g1 등)가 있으면 그 값, 없으면 계정에 저장된 값 */
  const gq = (k: string, saved: boolean) => { const v = act.q(k); return v == null ? saved : v === "1"; };
  const G = guard.data;
  const g1 = gq("g1", G ? G.chaseBuyWarnPercent != null : true), g3 = gq("g3", G ? G.blockAverageDownWithoutStop : false), g4 = gq("g4", G ? G.confirmSellOnDropPercent != null : false);
  const toggle = (k: "g1" | "g3" | "g4", on: boolean) => {
    if (act.requireLogin("guard")) return;
    act.guard(k, on);
    const patch: Partial<Guardrails> = k === "g1" ? { chaseBuyWarnPercent: on ? null : 3.0 } : k === "g3" ? { blockAverageDownWithoutStop: !on } : { confirmSellOnDropPercent: on ? null : 2.0 };
    void guard.patch.run(patch).catch(() => act.toast("가드레일을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.", { error: true }));
  };
  const Switch = ({ k, on, label }: { k: "g1" | "g3" | "g4"; on: boolean; label: string }) => <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => toggle(k, on)}></button>;

  return <div className="coach-wrap rv">
    <div className="rv-head"><div><h1>{mon}월 투자 복기</h1><p className="t-caption">{mon}월 1일~{new Date(+data.month.slice(0, 4), mon, 0).getDate()}일 주문 {T.length}건 · {mon === 1 ? 12 : mon - 1}월과 비교 · 판 주문은 확정 손익, 들고 있는 주문은 오늘 가격 기준</p></div>
      <span className="spacer"></span><div className="seg"><button aria-pressed="false">주간</button><button aria-pressed="true">월간</button></div></div>

    <div className="kpis five rv-kpis">
      <div className="kpi"><div className="rv-kh"><small>{mon}월 손익</small><span className="rv-ic"><Ic name="wallet" /></span></div><div className="rv-kv"><b className={tone(total)}>{sgn(total)}</b>{delta(total - AUG.realizedPnl, money)}</div></div>
      <div className="kpi"><div className="rv-kh"><small>수익 낸 주문 비율</small><span className="rv-ic"><Ic name="check" /></span></div><div className="rv-kv"><b>{winRate.toFixed(0)}%</b>{delta(winRate - AUG.winRate, pp)}</div><span>{T.length}건 중 {wins.length}건</span></div>
      <div className="kpi"><div className="rv-kh"><small>손익비</small><span className="rv-ic"><Ic name="chart" /></span></div><div className="rv-kv"><b>{ratio.toFixed(2)}</b>{delta(ratio - AUG.avgWinLossRatio, x => x.toFixed(2))}</div><span>평균 이익 {usd(avgWin)} · 평균 손실 {usd(avgLoss)}</span></div>
      <div className="kpi hl"><div className="rv-kh"><small>S&amp;P 500 대비</small><span className="rv-ic"><Ic name="trend" /></span></div><div className="rv-kv"><b className={tone(gap)}>{gap >= 0 ? "+" : ""}{gap.toFixed(2)}%p</b>{delta(gap - AUG.gapPercent, x => x.toFixed(2) + "%p")}</div><span>내 계좌 {pct(data.kpi.returnPercent)} · S&amp;P 500 {pct(data.benchmark.spxReturnPercent)}</span></div>
      <div className="kpi"><div className="rv-kh"><small>추격 매수·물타기 손익</small><span className="rv-ic"><Ic name="warn" /></span></div><div className="rv-kv"><b className={tone(mistakePnl)}>{sgn(mistakePnl)}</b>{delta(mistakePnl - AUG.mistakePnl, money)}</div><span>{mistakes.length}건{mistakes.every(t => t.pnl < 0) ? " 모두 손실" : ""}</span></div>
    </div>

    <div className="rv-row">
      <section className="panel"><div className="panel-head"><div><span className="t-title-sm">{mon}월 손익은 어디서 났나</span><p className="t-caption">{best.name} {best.n}건이 {sgn(best.pnl, 0)}를 벌었고, {worst.name} {worst.n}건이 {sgn(worst.pnl, 0)}를 깎았어요</p></div></div>
        <div className="panel-body">
          <div className="rv-fall" role="img" aria-label={`습관별 손익을 쌓아 ${mon}월 손익 ${sgn(total)}에 이르는 폭포 차트`}>
            {steps.map(s => { const lo = Math.min(s.from, s.to), hi = Math.max(s.from, s.to);
              return <div key={s.key} className="rv-col" data-tip={`${s.name} ${s.n}건, ${s.w}번 수익${s.missed > 0 ? `, 판 뒤 ${usd(s.missed)} 더 오름` : ""}`}>
                <div className="rv-plot"><i className={s.pnl >= 0 ? "up" : "down"} style={{ bottom: `${yp(lo)}%`, height: `max(3px,${yp(hi - lo)}%)` }}></i><b style={{ bottom: `calc(${yp(hi)}% + 6px)` }} className={tone(s.pnl)}>{sgn(s.pnl)}</b></div>
                <div className="rv-x"><span>{s.name}</span><small>{s.n}건 · {s.w}번 수익</small></div></div>; })}
            <div className="rv-col total" data-tip={`${mon}월 주문 ${T.length}건 손익 합계`}><div className="rv-plot"><i style={{ bottom: 0, height: `${yp(total)}%` }}></i><b style={{ bottom: `calc(${yp(total)}% + 6px)` }}>{sgn(total)}</b></div>
              <div className="rv-x"><span>{mon}월 합계</span><small>{T.length}건</small></div></div>
          </div>
          {rush && rush.missed > 0 ? <p className="rv-foot">하락에 놀라 판 {rushName}는 판 뒤 {usd(rush.missed)} 더 올랐어요. 손익에는 잡히지 않는 놓친 이익이에요.</p> : null}</div></section>
      <section className="panel"><div className="panel-head"><div><span className="t-title-sm">종목별 {mon}월 손익</span><p className="t-caption">{mon}월 주문만 모아서, 같은 종목은 합쳤어요</p></div></div>
        <div className="panel-body">{byStock.map(x => <div key={x.k} className="plrow"><span className="sym"><Mark symbol={x.k} color={syms[x.k]?.color} /><b>{ko(x.k)}</b></span><span className="plbar"><i style={{ ...(x.pnl >= 0 ? { left: "50%" } : { right: "50%" }), width: `${Math.abs(x.pnl) / maxAbs * 50}%`, background: x.pnl >= 0 ? "var(--up)" : "var(--down)" }}></i></span><span className={`r ${tone(x.pnl)}`}><b>{sgn(x.pnl)}</b><small className="muted">{x.n}건</small></span></div>)}
          <p className="rv-insight"><Ic name="spark" /><span>{ko(lead.k)} {lead.n}건을 빼면 나머지 {T.length - lead.n}건의 손익은 {sgn(total - lead.pnl)}에 그쳐요. {mon}월 수익은 거의 {ko(lead.k)} 한 종목에서 났어요.</span></p>
        </div></section>
    </div>

    <div className="rv-row">
      <section className="panel"><div className="panel-head"><div><span className="t-title-sm">주문 {T.length}건 수익률</span><p className="t-caption">수익률 순, 판 주문은 판 가격 기준</p></div><span className="spacer"></span><span className="rv-chip">손실 {losses.length}건 중 {lossInMistake}건이 추격 매수·물타기</span></div>
        <div className="panel-body">
          <div className="rv-trades" style={{ ["--z" as string]: `${z}%` }} role="img" aria-label={`${mon}월 주문 ${T.length}건의 수익률`}>
            {byRet.map(t => { const r = t.returnPercent; return <div key={t.orderId} className="rv-tcol" data-tip={`${t.at} ${ko(t.symbol)} ${t.side === "buy" ? "매수" : "매도"} · ${fmt.t(t.memo)}`}>
              <div className="rv-tplot"><i className={r >= 0 ? "up" : "down"} style={{ ...(r >= 0 ? { bottom: `${z}%` } : { top: `${100 - z}%` }), height: `${Math.abs(r) / span * 100}%` }}></i>
                <b className={tone(r)} style={r >= 0 ? { bottom: `calc(${z + r / span * 100}% + 4px)` } : { top: `calc(${100 - z - r / span * 100}% + 4px)` }}>{r >= 0 ? "+" : ""}{r.toFixed(1)}%</b></div>
              <div className="rv-tx"><Mark symbol={t.symbol} color={syms[t.symbol]?.color} /><small>{t.at}</small></div></div>; })}
          </div>
          <p className="rv-foot">이익 난 주문은 평균 {usd(avgWin)}, 손실 난 주문은 평균 {usd(avgLoss)}이에요. 손실을 작게 끊은 덕에 수익 낸 비율이 {winRate.toFixed(0)}%여도 손익비가 {ratio.toFixed(1)}배예요.</p></div></section>
      <section className="panel"><div className="panel-head"><div><span className="t-title-sm">판 뒤 주가</span><p className="t-caption">{mon}월에 판 {sells.length}건, 판 가격 대비 지금</p></div></div>
        <div className="panel-body">{sells.map(t => <div key={t.orderId} className="rv-sold"><span className="sym"><Mark symbol={t.symbol} color={syms[t.symbol]?.color} /><span><b>{ko(t.symbol)}</b><small>{t.at} 판 가격 {usd(t.price)} · 지금 {usd(t.now)}</small></span></span>
          <span className={`rv-pill ${tone(t.after)}`}>{t.after >= 0 ? "↑" : "↓"} {Math.abs(t.after).toFixed(1)}%</span></div>)}
          <p className="rv-insight"><Ic name="spark" /><span>{sells.length}건 중 {rose.length}건이 판 뒤 5% 넘게 더 올랐어요. 계속 들고 있었다면 {usd(missedSum)}를 더 벌었을 거예요.</span></p></div></section>
    </div>

    <div className="rv-row">
      <section className="panel"><div className="panel-head"><span className="t-title-sm">주문별 기록</span><span className="t-caption">{mon}월 {T.length}건</span></div>
        <div className="panel-body table-wrap"><table className="table">
          <thead><tr><th>날짜</th><th>종목</th><th>구분</th><th className="r">손익</th><th className="r">수익률</th><th>주문할 때 남긴 메모</th><th>복기</th></tr></thead>
          <tbody>{[...T].reverse().map(t => { const [tc, tv] = tagOf(t); return <tr key={t.orderId} className="row-link" onClick={() => navigate(`/stock?s=${t.symbol}`)}>
            <td className="muted nowrap">{t.at}</td><td><div className="sym"><Mark symbol={t.symbol} color={syms[t.symbol]?.color} /><b>{ko(t.symbol)}</b></div></td>
            <td className={`nowrap ${t.side === "buy" ? "up" : "down"}`} style={{ fontWeight: 600 }}>{t.side === "buy" ? "매수" : "매도"}</td>
            <td className={`r nowrap ${tone(t.pnl)}`}><b>{sgn(t.pnl)}</b></td><td className={`r nowrap ${tone(t.returnPercent)}`}>{pct(t.returnPercent)}</td>
            <td>{fmt.t(t.memo)}</td><td><span className={`tag ${tc}`}>{tv}</span></td></tr>; })}</tbody></table></div></section>
      <section className="panel"><div className="panel-head"><span className="t-title-sm">{nextMon}월 가드레일</span><span className="spacer"></span><span className="t-caption">계정에 저장돼요</span></div><div className="panel-body">
        <div className="guard"><div>급등일 추격 매수 경고<small>당일 +{(G?.chaseBuyWarnPercent ?? 3).toFixed(0)}% 넘게 오른 종목을 살 때 · {mon}월 {chase?.n ?? 0}건 <b className={tone(chase?.pnl ?? 0)}>{sgn(chase?.pnl ?? 0)}</b></small></div><Switch k="g1" on={g1} label="급등일 추격 매수 경고" /></div>
        <div className="guard"><div>손절가 없는 물타기 막기<small>평균 단가를 낮추는 매수에 손절가를 요구해요 · {mon}월 {avgDown?.n ?? 0}건 <b className={tone(avgDown?.pnl ?? 0)}>{sgn(avgDown?.pnl ?? 0)}</b></small></div><Switch k="g3" on={g3} label="손절가 없는 물타기 막기" /></div>
        <div className="guard"><div>하루 하락 매도 전 한 번 더 확인<small>당일 -2% 넘게 내린 종목을 팔 때 · {mon}월 {rush?.n ?? 0}건, 판 뒤 {usd(rush?.missed ?? 0)} 더 오름</small></div><Switch k="g4" on={g4} label="하루 하락 매도 전 한 번 더 확인" /></div>
        <div className="guard"><div>한 종목 비중 {G?.maxPositionWeightPercent ?? 25}% 제한<small>넘으면 주문 전에 알려 드려요</small></div><button className="switch" role="switch" aria-checked="true" aria-label={`한 종목 비중 ${G?.maxPositionWeightPercent ?? 25}% 제한`}></button></div>
      </div></section>
    </div>
  </div>;
}
