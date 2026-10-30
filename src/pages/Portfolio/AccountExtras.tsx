/* 보유 종목 탭 아래: 계좌 가치 변화, 자산 구성, 종목별 손익, 최근 활동. 목업 gops.js accountExtras(2912~2953) */
import { useSymbolMap } from "../../app/shell/useSymbolMap";
import { Mark } from "../../app/shell/Mark";
import { pct, tone, useFormat } from "../../app/format";
import { useAccount } from "../../data/hooks";

const COLS = ["var(--brand)", "var(--yellow)", "var(--orange)", "var(--purple)", "var(--ok)", "var(--muted-soft)"];
const md = (iso: string) => { const [, m, d] = iso.split("-"); return `${+m}/${+d}`; };
/* 받침이 있으면 "이", 없으면 "가" */
const iGa = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? "이" : "가"; };
const mdKo = (iso: string) => { const [, m, d] = iso.split("-"); return `${+m}월 ${+d}일`; };

export function AccountExtras() {
  const fmt = useFormat();
  const syms = useSymbolMap();
  const { summary, performance, activity } = useAccount();
  const a = summary.data, P = performance.data?.items ?? [];
  if (!a) return null;

  // 계좌 가치 변화: 내 계좌와 S&P 500 누적 수익률 선 두 개
  const A = P.map(p => p.accountReturnPercent), B = P.map(p => p.benchmarkReturnPercent), n = P.length;
  const W = 640, H = 220, L = 8, R = 48, T = 12, Bm = 26, lo = Math.min(-2, ...A, ...B), hi = Math.max(...A, ...B) + 1;
  const x = (i: number) => L + i * (W - L - R) / Math.max(1, n - 1), y = (v: number) => T + (hi - v) / (hi - lo) * (H - T - Bm);
  const pts = (arr: number[]) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const grid: number[] = []; for (let v = 0; v <= hi; v += 5) grid.push(v);
  /* 아래 날짜: 처음, 달이 바뀐 첫날, 마지막 */
  const ticks: [string, number][] = n ? [[md(P[0].date), 0]] : [];
  P.forEach((p, i) => { if (i && i < n - 1 && p.date.slice(0, 7) !== P[i - 1].date.slice(0, 7)) ticks.push([`${+p.date.slice(5, 7)}/1`, i]); });
  if (n > 1) ticks.push([md(P[n - 1].date), n - 1]);
  const accLast = A[n - 1] ?? a.cumulativeReturnPercent, benLast = B[n - 1] ?? a.benchmarkReturnPercent, diff = accLast - benLast;

  // 자산 구성: 보유 종목 평가 금액을 섹터로 묶고 현금 포함
  const parts: Record<string, number> = {};
  a.holdings.forEach(h => { const k = h.sectorLabelKo ?? "기타"; parts[k] = (parts[k] || 0) + h.price * h.qty; });
  parts["현금"] = a.cash;
  const total = Object.values(parts).reduce((t, v) => t + v, 0);
  const alloc = Object.entries(parts).sort((p, q) => Number(p[0] === "현금") - Number(q[0] === "현금") || q[1] - p[1]);
  const [topSec, topV] = alloc[0];

  // 종목별 손익
  const pl = a.holdings.map(h => ({ k: h.symbol, name: h.nameKo ?? h.symbol, v: (h.price - h.avgPrice) * h.qty, r: (h.price / h.avgPrice - 1) * 100 })).sort((p, q) => q.v - p.v);
  const maxPl = Math.max(...pl.map(p => Math.abs(p.v)), 1);
  const gain = pl.reduce((t, p) => t + p.v, 0), lead = pl[0];

  return <div className="acct-grid">
    <section className="panel"><div className="panel-head"><span className="t-label">계좌 가치 변화</span><span className="t-caption">{mdKo(a.openedAt)} 계좌 개설 이후</span><span className="spacer"></span>
      <span className="legend2"><i style={{ background: "var(--up)" }}></i>내 계좌 <b className={tone(accLast) === "up" ? "up" : undefined}>{pct(accLast)}</b><i style={{ background: "var(--muted-soft)" }}></i>S&amp;P 500 <b>{pct(benLast)}</b></span></div>
      <div className="panel-body">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="계좌 가치 변화">
          {grid.map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" /><text x={W - R + 8} y={y(v) + 4} fontSize="11" fill="var(--chart-axis)">{v > 0 ? "+" : ""}{v}%</text></g>)}
          {ticks.map(([t, i]) => <text key={t + i} x={x(i)} y={H - 6} fontSize="11" fill="var(--chart-axis)" textAnchor="middle">{t}</text>)}
          <polyline points={pts(B)} fill="none" stroke="var(--muted-soft)" strokeWidth="1.6" /><polyline points={pts(A)} fill="none" stroke="var(--up)" strokeWidth="2.2" />
          {n ? <circle cx={x(n - 1)} cy={y(A[n - 1])} r="4" fill="var(--up)" /> : null}
        </svg>
        <p className="t-caption" style={{ margin: "8px 0 0" }}>같은 기간 S&amp;P 500보다 {Math.abs(diff).toFixed(2)}%p 더 {diff >= 0 ? "올랐어요" : "내렸어요"}.{lead && gain > 0 && lead.v > gain / 2 ? ` ${lead.name} 수익이 절반 넘게 차지해요.` : ""}</p></div></section>
    <section className="panel"><div className="panel-head"><span className="t-label">자산 구성</span><span className="t-caption">평가 금액 기준</span></div>
      <div className="panel-body"><div className="stack" style={{ height: 14, margin: "4px 0 14px" }}>{alloc.map(([k, v], i) => <i key={k} style={{ flex: v, background: COLS[i % COLS.length] }}></i>)}</div>
        {alloc.map(([nme, v], i) => <div key={nme} className="allocrow"><i style={{ background: COLS[i % COLS.length] }}></i><span>{nme}</span><b>{(v / total * 100).toFixed(1)}%</b><span className="muted">{fmt.usd(v, 0)}</span></div>)}
        {topSec !== "현금" ? <p className="t-caption" style={{ margin: "10px 0 0" }}>{topSec}{iGa(topSec)} {(topV / total * 100).toFixed(0)}%예요. 한 섹터에 많이 몰려 있으면 그 섹터가 내릴 때 계좌 전체가 크게 흔들려요.</p> : null}</div></section>
    <section className="panel"><div className="panel-head"><span className="t-label">종목별 손익</span><span className="t-caption">산 가격 대비 지금</span></div>
      <div className="panel-body">{pl.map(p => <div key={p.k} className="plrow"><span className="sym"><Mark symbol={p.k} color={syms[p.k]?.color} /><b>{p.name}</b></span><span className="plbar"><i style={{ ...(p.v >= 0 ? { left: "50%" } : { right: "50%" }), width: `${Math.abs(p.v) / maxPl * 50}%`, background: p.v >= 0 ? "var(--up)" : "var(--down)" }}></i></span><span className={`r ${tone(p.v)}`}><b>{p.v >= 0 ? "+" : "-"}{fmt.usd(Math.abs(p.v), 0)}</b><small>{pct(p.r)}</small></span></div>)}</div></section>
    <section className="panel"><div className="panel-head"><span className="t-label">최근 활동</span></div>
      <div className="panel-body"><ul className="events act">
        {(activity.data?.items ?? []).map((e, i) => <li key={i}><time>{e.at}</time><span>{e.symbol ? <Mark symbol={e.symbol} color={syms[e.symbol]?.color} /> : null}<b>{fmt.t(e.text)}</b>{e.sub ? <small>{fmt.t(e.sub)}</small> : null}</span></li>)}
      </ul></div></section>
  </div>;
}
