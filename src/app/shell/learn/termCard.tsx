/* 사이드바 '용어 풀이'의 용어 카드 본문. 목업 gops.js termCard(1224~1366)·termInner(1372).
   뜻 → 왜 보나 → 높고 낮음 → 그림 → 읽는 법 → 흔한 오해. 그림은 지금 종목의 캔들에서 계산해 숫자와 그림이 서로 맞게 한다.
   좋다/나쁘다, 사라/팔아라는 쓰지 않고 앞으로의 가격도 그리지 않는다 */
import type { ReactNode } from "react";
import type { Bar } from "../../../charts/types";
import { CW, gauge, pastLine, candleShapes, lastDayCandle, supResStrip, supportTouches, trendLine } from "../../../charts/termFigures";
import { RSI_N, rsiParts, rsiSeries, rsiWilder } from "../../../charts/indicators";
import { md, fx1 } from "../../../charts/format";
import { Svg } from "../../Svg";

export type TermData = {
  symbol: string;
  /** 최근 84거래일 일봉 */
  C: Bar[];
  price: number;
  per: number; sper: number; lo: number; hi: number;
  /** 오늘 거래량이 20일 평균의 몇 배 */
  x: number;
  /** 오늘 거래량 표기 ("4.12억 주") */
  vol: string;
  sup: number; res: number;
  peers: [string, number][];
};
type Dir = "high" | "low" | "ends" | "none";
export type TermCardContent = { title: string; value: string; sub: string; mean: string; why: string; blocks: [string, ReactNode][]; dir?: [Dir, string]; read: string; myth?: string; note?: string };

const DIR_NAME: Record<Dir, string> = { high: "높을수록 유리한 편", low: "낮을수록 유리한 편", ends: "양 끝을 봐요", none: "좋고 나쁨이 따로 없어요" };

/* 고점·저점: 앞뒤 k(7)거래일 안에서 가장 높은(낮은) 날. 오른쪽 끝 k일은 아직 확정이 안 돼서 뺀다 */
export function pivotsOf(C: Bar[], k = 7) {
  const hi: number[] = [], lo: number[] = [];
  for (let i = k; i < C.length - k; i++) {
    const w = C.slice(i - k, i + k + 1);
    if (C[i].h >= Math.max(...w.map(d => d.h))) hi.push(i);
    if (C[i].l <= Math.min(...w.map(d => d.l))) lo.push(i);
  }
  return { hi, lo };
}
/* 최근 고점 3개와 저점 3개에서 처음보다 마지막이 높아졌는지 낮아졌는지로 추세 이름을 붙인다 (지난 사실만) */
export function trendOf(C: Bar[]): [string, string] {
  const { hi, lo } = pivotsOf(C), H = hi.slice(-3).map(i => C[i].h), Lw = lo.slice(-3).map(i => C[i].l);
  const dir = (a: number[]) => a.length < 2 ? 0 : Math.sign(a[a.length - 1] - a[0]), h = dir(H), l = dir(Lw), v = h && l ? (h === l ? h : 0) : h || l;
  if (v > 0) return ["상승 추세", h && l ? "고점과 저점이 둘 다 점점 높아졌어요" : "고점이 점점 높아졌어요"];
  if (v < 0) return ["하락 추세", h && l ? "고점과 저점이 둘 다 점점 낮아졌어요" : "고점이 점점 낮아졌어요"];
  return ["횡보", "고점과 저점이 한쪽으로 기울지 않고 오르내렸어요"];
}

const Dot = ({ c }: { c: string }) => <i className="dot" style={{ background: c }}></i>;

export function termCard(key: string, D: TermData, usd: (v: number, d?: number) => string): TermCardContent | null {
  const { C, symbol: s } = D, n = C.length;
  if (!n) return null;
  if (key === "rsi") {
    const P = rsiParts(C), mx = Math.max(...P.days.map(x => Math.abs(x.d))), bw = (CW - 8) / RSI_N;
    const R = rsiSeries(C), hot = R.map((v, i) => [i, v] as const).filter(([, v]) => v != null && v >= 70), cold = R.map((v, i) => [i, v] as const).filter(([, v]) => v != null && v <= 30);
    const upN = P.days.filter(x => x.d > 0).length, w = rsiWilder(C);
    return { title: `RSI(${RSI_N})`, value: fx1(P.v), sub: "최근 14거래일",
      mean: "최근 14거래일 동안 가격이 움직인 폭 가운데 오른 쪽이 차지하는 비율이에요.",
      why: "최근 가격이 오르는 쪽과 내리는 쪽 중 어디로 얼마나 쏠렸는지 숫자 하나로 볼 때 써요.",
      blocks: [
        ["계산 재료", <>
          <svg viewBox={`0 0 ${CW} 112`} className="mini">
            <line x1="0" x2={CW} y1="52" y2="52" stroke="var(--hairline-strong)" />
            {P.days.map((x, i) => { const h = Math.abs(x.d) / mx * 42; return <rect key={i} x={4 + i * bw + bw * 0.18} y={x.d > 0 ? 52 - h : 52} width={bw * 0.64} height={Math.max(1, h)} rx="1.5" fill={x.d > 0 ? "var(--up)" : "var(--down)"} />; })}
            <text x="4" y="110" fontSize="10.5" fill="var(--muted-soft)">{md(P.days[0].t)}</text><text x={CW - 4} y="110" fontSize="10.5" fill="var(--muted-soft)" textAnchor="end">{md(P.days[RSI_N - 1].t)}</text>
          </svg>
          <div className="sums"><span><i className="up">▲</i> 오른 날 {upN}일, 오른 폭 합계 <b className="up">+{usd(P.up)}</b></span><span><i className="down">▼</i> 내린 날 {RSI_N - upN}일, 내린 폭 합계 <b className="down">−{usd(P.down)}</b></span></div>
          <div className="ratio"><span style={{ width: `${P.v}%` }} className="u">오른 쪽 {Math.round(P.v)}%</span><span className="d">{Math.round(100 - P.v)}%</span></div>
          <p className="cap">막대 하나가 하루예요. 위로 솟은 빨간 막대가 오른 폭, 아래 파란 막대가 내린 폭이에요. 이 둘의 비율이 그대로 RSI가 돼요.</p></>],
        ["지금 위치", <Svg html={gauge(P.v, 100, [[0, 30, "var(--down)", "과매도라고 불러요"], [30, 70, "transparent", ""], [70, 100, "var(--up)", "과매수라고 불러요"]], [0, 30, 70, 100])} />],
        ["이 종목의 지난 4개월", <><Svg html={pastLine(C, [...hot.map(([i]) => [i, "var(--up)"] as [number, string]), ...cold.map(([i]) => [i, "var(--down)"] as [number, string])])} />
          <p className="cap">{hot.length || cold.length ? <><Dot c="var(--up)" />70 이상이었던 날 {hot.length}일 <Dot c="var(--down)" />30 이하였던 날 {cold.length}일</> : "지난 4개월 동안 70 위나 30 아래로 간 날은 없었어요."}</p></>]],
      dir: ["ends", "30~70 사이면 어느 쪽으로도 크게 쏠리지 않았다는 뜻이고, 양 끝으로 갈수록 한쪽으로 쏠렸다는 뜻이에요."],
      read: "70을 넘으면 최근에 거의 오르기만 했다는 뜻이고, 업계에서는 이걸 '과매수'라고 불러요. 30 아래는 반대로 '과매도'예요.",
      myth: "'과매수'라는 이름 때문에 곧 내릴 거라고 보기 쉽지만, 이름이 방향이 바뀐다는 뜻은 아니에요. 강하게 오르는 종목은 70 위에 몇 주씩 머물기도 해요.",
      note: Math.abs(w - P.v) >= 1 ? `다른 증권 앱은 오래된 날의 비중을 조금씩 줄여 평균 내는 방식(와일더 방식)을 많이 써요. 그 방식으로는 ${fx1(w)}이라서 숫자가 다르게 보일 수 있어요.` : "" };
  }
  if (key === "vol") {
    const W = C.slice(-21), av = W.slice(0, 20).reduce((a, d) => a + d.v, 0) / 20, mx = Math.max(...W.map(d => d.v)), bw = (CW - 8) / 21, Y = (v: number) => 92 - v / mx * 80;
    const big = C.map((d, i) => i >= 20 && d.v >= 2 * C.slice(i - 20, i).reduce((a, x) => a + x.v, 0) / 20 ? i : -1).filter(i => i >= 0);
    return { title: "거래량", value: D.vol, sub: `평균의 ${D.x.toFixed(1)}배`,
      mean: "오늘 하루 동안 사고판 주식 수예요. '평균의 몇 배'는 최근 20거래일 평균과 비교한 값이에요.",
      why: "가격이 움직일 때 얼마나 많은 사람이 참여했는지 볼 때 써요.",
      blocks: [
        ["계산 재료", <><svg viewBox={`0 0 ${CW} 110`} className="mini">
            {W.map((d, i) => <rect key={i} x={4 + i * bw + bw * 0.15} y={Y(d.v)} width={bw * 0.7} height={92 - Y(d.v)} rx="1.5" fill={i === 20 ? "var(--brand)" : "var(--muted-soft)"} opacity={i === 20 ? 1 : .5} />)}
            <line x1="4" x2={CW - 4 - bw} y1={Y(av)} y2={Y(av)} stroke="var(--ink)" strokeDasharray="4 3" />
            <text x="6" y={Y(av) - 5} fontSize="11" fill="var(--ink)" className="halo-card">20일 평균</text>
            <text x="4" y="108" fontSize="10.5" fill="var(--muted-soft)">{md(W[0].t)}</text><text x={CW - 4} y="108" fontSize="10.5" fill="var(--brand)" fontWeight="600" textAnchor="end">오늘</text>
          </svg><p className="cap">회색 막대 20개의 평균(점선)과 오늘(파란 막대)을 비교해요.</p></>],
        ["지금 위치", <Svg html={gauge(D.x, 3, [[0, 0.8, "var(--muted-soft)", "평소보다 적음"], [0.8, 1.5, "transparent", "평소"], [1.5, 3, "var(--brand)", "평소보다 많음"]], [0, 1, 2, 3], v => v.toFixed(1) + "배")} />],
        ["이 종목의 지난 4개월", <><Svg html={pastLine(C, big.map(i => [i, "var(--brand)"] as [number, string]))} /><p className="cap"><Dot c="var(--brand)" />평균의 2배 넘게 거래된 날 {big.length}일</p></>]],
      dir: ["none", "많고 적음보다 평소(1배)와 얼마나 다른지를 봐요."],
      read: "가격이 크게 움직인 날 거래량도 많았다면 그 움직임에 많은 사람이 참여했다는 뜻이고, 거래량이 적었다면 소수의 거래로 움직였다는 뜻이에요.",
      myth: "거래량이 많으면 오른다고 보기 쉽지만, 내릴 때도 거래량은 늘어요. 거래량만으로는 오를지 내릴지 알 수 없어요." };
  }
  if (key === "per") {
    const eps = D.price / D.per, cells = Math.min(60, Math.round(D.per));
    const pts: [string, number][] = [["업종 평균", D.sper], ...D.peers.filter(([k]) => k !== s), [s, D.per]];
    const lo = Math.min(...pts.map(p => p[1])) * 0.85, hi = Math.max(...pts.map(p => p[1])) * 1.1, X = (v: number) => 10 + (v - lo) / (hi - lo) * (CW - 20);
    return { title: "PER (선행)", value: D.per.toFixed(1) + "배", sub: `업종 평균 ${D.sper.toFixed(1)}배`,
      mean: "주가가 1주당 1년 이익의 몇 배인지예요. '선행'은 지난 이익이 아니라 앞으로 12개월 추정 이익으로 계산했다는 뜻이에요.",
      why: "비슷한 회사끼리 이익에 비해 얼마나 비싸게 거래되는지 비교할 때 써요.",
      blocks: [
        ["계산 재료", <><div className="eq"><span><b>{usd(D.price)}</b><small>주가</small></span>÷<span><b>{usd(eps)}</b><small>1주당 1년 이익</small></span>=<span><b>{D.per.toFixed(1)}배</b><small>PER</small></span></div>
          <div className="cells">{Array.from({ length: cells }, (_, i) => <i key={i}></i>)}</div>
          <p className="cap">칸 하나가 1년치 이익이에요. 이익이 지금 수준 그대로라면 {cells}년을 모아야 지금 주가만큼 돼요.</p></>],
        ["지금 위치", <><svg viewBox={`0 0 ${CW} 64`} className="mini">
            <line x1="10" x2={CW - 10} y1="30" y2="30" stroke="var(--hairline-strong)" strokeWidth="2" />
            {pts.map(([k, v], i) => { const me = k === s, avg = i === 0; return <g key={k}><circle cx={X(v)} cy="30" r={me ? 6 : 4} fill={me ? "var(--brand)" : avg ? "var(--ink)" : "var(--muted-soft)"} />
              <text x={X(v)} y={i % 2 ? 54 : 16} fontSize="11" fontWeight={me ? 700 : 400} fill={me ? "var(--brand)" : "var(--ink-muted)"} textAnchor="middle">{k} {v.toFixed(1)}</text></g>; })}
          </svg><p className="cap">오른쪽으로 갈수록 이익에 비해 비싸게 거래된다는 뜻이에요.</p></>]],
      dir: ["none", "같은 업종 평균보다 높으면 이익에 비해 비싸게, 낮으면 싸게 거래된다는 뜻이에요. 그 자체로 좋고 나쁨은 아니에요."],
      read: "높다는 건 앞으로 이익이 늘 거라는 기대가 가격에 이미 많이 들어가 있다는 뜻이에요. 이익이 기대만큼 늘지 않으면 그만큼 부담이 돼요. 업종마다 보통 수준이 달라서 같은 업종끼리 비교해요.",
      myth: "PER이 낮다고 꼭 싼 건 아니에요. 회사의 앞날을 어둡게 보거나 이익 추정치를 믿지 못하면 PER은 오래 낮게 머물기도 해요." };
  }
  if (key === "range") {
    const X = (v: number) => 10 + (v - D.lo) / (D.hi - D.lo) * (CW - 20), p = D.price;
    return { title: "52주 범위", value: `${usd(D.lo, 1)}~${usd(D.hi, 1)}`, sub: "지난 1년",
      mean: "지난 1년(52주) 동안 가장 낮았던 가격과 가장 높았던 가격이에요.",
      why: "지금 가격이 1년 범위 중 어디쯤인지 감을 잡을 때 써요.",
      blocks: [["지금 위치", <><svg viewBox={`0 0 ${CW} 60`} className="mini">
          <rect x="10" y="26" width={CW - 20} height="8" rx="4" fill="var(--control)" />
          <text x="10" y="54" fontSize="11" fill="var(--ink-muted)">1년 최저 {usd(D.lo)}</text><text x={CW - 10} y="54" fontSize="11" fill="var(--ink-muted)" textAnchor="end">1년 최고 {usd(D.hi)}</text>
          <path d={`M${X(p) - 6} 10 h12 l-6 9 z`} fill="var(--brand)" /><text x={Math.min(X(p), CW - 40)} y="8" fontSize="11.5" fontWeight="700" fill="var(--brand)" textAnchor="middle">지금 {usd(p)}</text>
        </svg><p className="cap">최고가보다 {Math.abs((p / D.hi - 1) * 100).toFixed(1)}% 아래, 최저가보다 {((p / D.lo - 1) * 100).toFixed(1)}% 위예요.</p></>]],
      dir: ["none", "1년 중 어디쯤인지 위치만 알려 줘요."],
      read: "지금 가격이 1년 동안 오간 폭 안에서 아래쪽인지 위쪽인지를 봐요.",
      myth: "최고가 근처라고 비싸고, 최저가 근처라고 싸다는 뜻은 아니에요." };
  }
  if (key === "opm") {
    /* 목업도 숫자를 고정해 뒀다 (영업이익률은 아직 받을 엔드포인트가 없다) */
    const gross = 75.1, op = 62.4, sec = 24.9, seg: [string, number, string][] = [["매출원가", 100 - gross, "var(--muted-soft)"], ["판매·관리비 등", gross - op, "var(--hairline-strong)"], ["영업이익", op, "var(--brand)"]];
    return { title: "영업이익률", value: op + "%", sub: `섹터 중앙값 ${sec}%`,
      mean: "매출에서 물건 만드는 데 든 돈과 회사 운영비를 빼고 남은 돈(영업이익)이 매출의 몇 %인지예요.",
      why: "회사가 본업으로 매출에서 얼마를 남기는지 볼 때 써요.",
      blocks: [
        ["계산 재료", <><div className="stack">{seg.map(([t, v, c]) => <span key={t} style={{ width: `${v}%`, background: c }} title={t}></span>)}</div>
          <div className="legend">{seg.map(([t, v, c]) => <span key={t}><i style={{ background: c }}></i>{t} {v.toFixed(1)}</span>)}</div>
          <p className="cap">매출 100달러를 셋으로 나눈 그림이에요. 파란 부분 {op}달러가 영업이익으로 남았어요.</p></>],
        ["같은 업종과 비교", <div className="bars2"><div><span>{s}</span><i style={{ width: `${op}%`, background: "var(--brand)" }}></i><b>{op}%</b></div><div><span>섹터 중앙값</span><i style={{ width: `${sec}%`, background: "var(--muted-soft)" }}></i><b>{sec}%</b></div></div>]],
      dir: ["high", "같은 업종 안에서는 높을수록 같은 매출에서 남기는 몫이 커요."],
      read: "매출이 같아도 영업이익률이 높으면 남는 돈이 더 많아요. 분기마다 오르는지 내리는지도 같이 봐요.",
      myth: "업종이 다르면 그대로 비교하기 어려워요. 소프트웨어는 높고 유통은 낮은 게 보통이에요." };
  }
  if (key === "candle") {
    const d = C[n - 1];
    return { title: "캔들 읽는 법", value: "", sub: "",
      mean: "하루 동안의 가격 네 개(시작, 끝, 가장 높았던, 가장 낮았던)를 막대 하나로 그린 거예요.",
      why: "하루 동안 가격이 어떻게 움직였는지 숫자 네 개를 읽지 않고 모양으로 볼 때 써요.",
      blocks: [
        ["모양 익히기", <><Svg html={candleShapes()} /><p className="cap">굵은 몸통은 시작과 끝 사이, 위아래 가는 선(꼬리)은 그날 갔다가 되돌아온 가격이에요.</p></>],
        [`${s} 마지막 날 (${md(d.t)})`, <><Svg html={lastDayCandle(d, v => usd(v))} />
          <p className="cap">{d.c >= d.o ? `시작(${usd(d.o)})보다 ${usd(d.c - d.o)} 높게 끝나서 빨간 양봉이에요.` : `시작(${usd(d.o)})보다 ${usd(d.o - d.c)} 낮게 끝나서 파란 음봉이에요.`}</p></>]],
      read: "몸통이 길수록 그날 시작과 끝의 차이가 컸다는 뜻이에요. 꼬리가 길면 장중에 그 가격까지 갔다가 되돌아왔다는 뜻이고요. 국내 앱은 오른 날을 빨강, 내린 날을 파랑으로 그려요(미국 앱은 반대로 초록·빨강을 많이 써요).",
      myth: "양봉이어도 어제보다는 내렸을 수 있어요. 양봉·음봉은 어제 가격이 아니라 그날 시작 가격과 비교한 거예요." };
  }
  if (key === "sup") {
    const W = C.slice(-20), m = n - 20, tch = supportTouches(C, D.sup).map(i => i - m);
    return { title: "지지선·저항선", value: `지지 ${usd(D.sup)}`, sub: `저항 ${usd(D.res)}`,
      mean: "지지선은 가격이 여러 번 내려왔다가 멈추고 다시 올라간 가격대, 저항선은 여러 번 올라갔다가 막힌 가격대예요.",
      why: "그 가격 근처에서 사려는 사람(지지)이나 팔려는 사람(저항)이 많았다는 기록이라, 가격이 그 근처에 왔을 때를 볼 때 써요.",
      blocks: [["최근 20거래일", <><Svg html={supResStrip(W, D.sup, D.res, tch)} /><p className="cap">노란 동그라미가 지지선 근처까지 내려왔다가 올라간 날이에요 ({tch.length}번).</p></>]],
      read: "선은 지난 가격의 기록이에요. 종가가 지지선 아래에서 마감하면 '이탈', 저항선 위에서 마감하면 '돌파'라고 불러요.",
      myth: "선이 있다고 그 자리에서 꼭 멈추는 건 아니에요." };
  }
  if (key === "trend") {
    const [tn, td] = trendOf(C), { hi, lo } = pivotsOf(C);
    return { title: "추세", value: tn, sub: "지난 4개월",
      mean: "고점과 저점이 이어지는 방향이에요. 둘 다 높아지면 상승 추세, 둘 다 낮아지면 하락 추세, 한쪽으로 기울지 않으면 횡보라고 불러요.",
      why: "하루하루의 오르내림 대신 몇 주, 몇 달의 큰 흐름을 볼 때 써요.",
      blocks: [["이 종목의 지난 4개월", <><Svg html={trendLine(C, hi, lo)} /><p className="cap"><Dot c="var(--up)" />최근 고점 <Dot c="var(--down)" />최근 저점. {td}.</p></>]],
      read: "추세는 지난 고점·저점의 모양에 붙인 이름이에요. 하루 이틀의 오르내림보다 몇 주 단위의 흐름을 볼 때 맞아요.",
      myth: "지금까지 상승 추세였다고 앞으로도 오른다는 뜻은 아니에요." };
  }
  return null;
}

/* 카드 본문: 떠 있는 용어 카드와 사이드바 패널이 같이 쓴다 */
export function TermInner({ c }: { c: TermCardContent }) {
  return <>
    <dl><dt>뜻</dt><dd>{c.mean}</dd><dt>왜 보나</dt><dd>{c.why}</dd>
      {c.dir ? <><dt>높고 낮음</dt><dd><span className="tag dir">{DIR_NAME[c.dir[0]]}</span> {c.dir[1]}</dd></> : null}</dl>
    {c.blocks.map(([t, h]) => <section key={t}><h4>{t}</h4>{h}</section>)}
    <dl className="read"><dt>읽는 법</dt><dd>{c.read}</dd></dl>
    {c.myth ? <p className="myth"><b>흔한 오해</b>{c.myth}</p> : null}
    {c.note ? <p className="note">{c.note}</p> : null}
  </>;
}
