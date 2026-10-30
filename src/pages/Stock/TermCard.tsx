/* 용어 카드. 목업 gops.js termCard(1224~1366)·termInner(1372)·termCardHTML(1378)·placeTermCard(1388).
   뜻 → 왜 보나 → 높고 낮음 → 그림 → 읽는 법 → 흔한 오해. 그림은 지금 보는 종목의 캔들에서 계산해 숫자와 그림이 맞게 한다.
   좋다/나쁘다, 사라/팔아라는 쓰지 않는다. 앞으로의 가격도 그리지 않는다 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Ic } from "../../app/icons";
import { useFormat, type Fmt } from "../../app/format";
import { CW, RSI_N, candleShapes, gauge, lastDayCandle, pastLine, rsiParts, rsiSeries, rsiWilder, supResStrip, supportTouches, trendLine, type Bar } from "../../charts";
import { useCourse } from "../../data/hooks";
import { md, useStockData, type StockData } from "./data";

type Card = { title: string; value: string; sub: string; mean: string; why: string; blocks: [string, ReactNode][]; dir?: [keyof typeof DIR_NAME, string]; read: string; myth?: string; note?: string };
const DIR_NAME = { high: "높을수록 유리한 편", low: "낮을수록 유리한 편", ends: "양 끝을 봐요", none: "좋고 나쁨이 따로 없어요" };
const fx1 = (v: number) => v.toFixed(1);
/* 차트 모듈이 만든 그림 문자열(숫자만 들어가고 글은 이스케이프돼 있다) */
const Svg = ({ html }: { html: string }) => <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
const Cap = ({ children }: { children: ReactNode }) => <p className="cap">{children}</p>;
const Dot = ({ c }: { c: string }) => <i className="dot" style={{ background: c }}></i>;

/* 고점·저점: 앞뒤 k(7)거래일 안에서 가장 높은(낮은) 날 (목업 pivotsOf 1163) */
function pivotsOf(C: Bar[], k = 7) {
  const hi: number[] = [], lo: number[] = [];
  for (let i = k; i < C.length - k; i++) {
    const w = C.slice(i - k, i + k + 1);
    if (C[i].h >= Math.max(...w.map(d => d.h))) hi.push(i);
    if (C[i].l <= Math.min(...w.map(d => d.l))) lo.push(i);
  }
  return { hi, lo };
}
function trendOf(C: Bar[]): [string, string] {
  const { hi, lo } = pivotsOf(C), H = hi.slice(-3).map(i => C[i].h), L = lo.slice(-3).map(i => C[i].l);
  const dir = (a: number[]) => a.length < 2 ? 0 : Math.sign(a[a.length - 1] - a[0]), h = dir(H), l = dir(L), v = h && l ? (h === l ? h : 0) : h || l;
  if (v > 0) return ["상승 추세", h && l ? "고점과 저점이 둘 다 점점 높아졌어요" : "고점이 점점 높아졌어요"];
  if (v < 0) return ["하락 추세", h && l ? "고점과 저점이 둘 다 점점 낮아졌어요" : "고점이 점점 낮아졌어요"];
  return ["횡보", "고점과 저점이 한쪽으로 기울지 않고 오르내렸어요"];
}

export function termCardOf(key: string, D: StockData, fmt: Fmt): Card | null {
  const { C, F, s } = D, n = C.length, usd = fmt.usd;
  if (!F || n < 30) return null;
  const price = D.summary?.price ?? D.p;
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
          <Cap>막대 하나가 하루예요. 위로 솟은 빨간 막대가 오른 폭, 아래 파란 막대가 내린 폭이에요. 이 둘의 비율이 그대로 RSI가 돼요.</Cap></>],
        ["지금 위치", <Svg html={gauge(P.v, 100, [[0, 30, "var(--down)", "과매도라고 불러요"], [30, 70, "transparent", ""], [70, 100, "var(--up)", "과매수라고 불러요"]], [0, 30, 70, 100])} />],
        ["이 종목의 지난 4개월", <><Svg html={pastLine(C, [...hot.map(([i]) => [i, "var(--up)"] as [number, string]), ...cold.map(([i]) => [i, "var(--down)"] as [number, string])])} />
          <Cap>{hot.length || cold.length ? <><Dot c="var(--up)" />70 이상이었던 날 {hot.length}일 <Dot c="var(--down)" />30 이하였던 날 {cold.length}일</> : "지난 4개월 동안 70 위나 30 아래로 간 날은 없었어요."}</Cap></>]],
      dir: ["ends", "30~70 사이면 어느 쪽으로도 크게 쏠리지 않았다는 뜻이고, 양 끝으로 갈수록 한쪽으로 쏠렸다는 뜻이에요."],
      read: "70을 넘으면 최근에 거의 오르기만 했다는 뜻이고, 업계에서는 이걸 '과매수'라고 불러요. 30 아래는 반대로 '과매도'예요.",
      myth: "'과매수'라는 이름 때문에 곧 내릴 거라고 보기 쉽지만, 이름이 방향이 바뀐다는 뜻은 아니에요. 강하게 오르는 종목은 70 위에 몇 주씩 머물기도 해요.",
      note: Math.abs(w - P.v) >= 1 ? `다른 증권 앱은 오래된 날의 비중을 조금씩 줄여 평균 내는 방식(와일더 방식)을 많이 써요. 그 방식으로는 ${fx1(w)}이라서 숫자가 다르게 보일 수 있어요.` : "" };
  }
  if (key === "vol") {
    const W = C.slice(-21), av = W.slice(0, 20).reduce((a, d) => a + d.v, 0) / 20, mx = Math.max(...W.map(d => d.v)), bw = (CW - 8) / 21, Y = (v: number) => 92 - v / mx * 80;
    const big = C.map((d, i) => i >= 20 && d.v >= 2 * C.slice(i - 20, i).reduce((a, x) => a + x.v, 0) / 20 ? i : -1).filter(i => i >= 0);
    return { title: "거래량", value: volText(F.volShares), sub: `평균의 ${F.x.toFixed(1)}배`,
      mean: "오늘 하루 동안 사고판 주식 수예요. '평균의 몇 배'는 최근 20거래일 평균과 비교한 값이에요.",
      why: "가격이 움직일 때 얼마나 많은 사람이 참여했는지 볼 때 써요.",
      blocks: [
        ["계산 재료", <><svg viewBox={`0 0 ${CW} 110`} className="mini">
            {W.map((d, i) => <rect key={i} x={4 + i * bw + bw * 0.15} y={Y(d.v)} width={bw * 0.7} height={92 - Y(d.v)} rx="1.5" fill={i === 20 ? "var(--brand)" : "var(--muted-soft)"} opacity={i === 20 ? 1 : .5} />)}
            <line x1="4" x2={CW - 4 - bw} y1={Y(av)} y2={Y(av)} stroke="var(--ink)" strokeDasharray="4 3" />
            <text x="6" y={Y(av) - 5} fontSize="11" fill="var(--ink)" className="halo-card">20일 평균</text>
            <text x="4" y="108" fontSize="10.5" fill="var(--muted-soft)">{md(W[0].t)}</text><text x={CW - 4} y="108" fontSize="10.5" fill="var(--brand)" fontWeight="600" textAnchor="end">오늘</text>
          </svg><Cap>회색 막대 20개의 평균(점선)과 오늘(파란 막대)을 비교해요.</Cap></>],
        ["지금 위치", <Svg html={gauge(F.x, 3, [[0, 0.8, "var(--muted-soft)", "평소보다 적음"], [0.8, 1.5, "transparent", "평소"], [1.5, 3, "var(--brand)", "평소보다 많음"]], [0, 1, 2, 3], v => v.toFixed(1) + "배")} />],
        ["이 종목의 지난 4개월", <><Svg html={pastLine(C, big.map(i => [i, "var(--brand)"] as [number, string]))} /><Cap><Dot c="var(--brand)" />평균의 2배 넘게 거래된 날 {big.length}일</Cap></>]],
      dir: ["none", "많고 적음보다 평소(1배)와 얼마나 다른지를 봐요."],
      read: "가격이 크게 움직인 날 거래량도 많았다면 그 움직임에 많은 사람이 참여했다는 뜻이고, 거래량이 적었다면 소수의 거래로 움직였다는 뜻이에요.",
      myth: "거래량이 많으면 오른다고 보기 쉽지만, 내릴 때도 거래량은 늘어요. 거래량만으로는 오를지 내릴지 알 수 없어요." };
  }
  if (key === "per") {
    const eps = price / F.per, cells = Math.min(60, Math.round(F.per));
    const peers = (D.summary?.peers ?? []).filter(x => x.symbol !== s && x.per != null).map(x => [x.symbol, x.per!] as [string, number]).concat([[s, F.per]]), pts: [string, number][] = [["업종 평균", F.sper], ...peers];
    const lo = Math.min(...pts.map(p => p[1])) * 0.85, hi = Math.max(...pts.map(p => p[1])) * 1.1, X = (v: number) => 10 + (v - lo) / (hi - lo) * (CW - 20);
    return { title: "PER (선행)", value: F.per.toFixed(1) + "배", sub: `업종 평균 ${F.sper.toFixed(1)}배`,
      mean: "주가가 1주당 1년 이익의 몇 배인지예요. '선행'은 지난 이익이 아니라 앞으로 12개월 추정 이익으로 계산했다는 뜻이에요.",
      why: "비슷한 회사끼리 이익에 비해 얼마나 비싸게 거래되는지 비교할 때 써요.",
      blocks: [
        ["계산 재료", <><div className="eq"><span><b>{usd(price)}</b><small>주가</small></span>÷<span><b>{usd(eps)}</b><small>1주당 1년 이익</small></span>=<span><b>{F.per.toFixed(1)}배</b><small>PER</small></span></div>
          <div className="cells">{Array.from({ length: cells }, (_, i) => <i key={i}></i>)}</div>
          <Cap>칸 하나가 1년치 이익이에요. 이익이 지금 수준 그대로라면 {cells}년을 모아야 지금 주가만큼 돼요.</Cap></>],
        ["지금 위치", <><svg viewBox={`0 0 ${CW} 64`} className="mini">
            <line x1="10" x2={CW - 10} y1="30" y2="30" stroke="var(--hairline-strong)" strokeWidth="2" />
            {pts.map(([k, v], i) => { const me = k === s, avg = i === 0; return <g key={k}><circle cx={X(v)} cy="30" r={me ? 6 : 4} fill={me ? "var(--brand)" : avg ? "var(--ink)" : "var(--muted-soft)"} />
              <text x={X(v)} y={i % 2 ? 54 : 16} fontSize="11" fontWeight={me ? 700 : 400} fill={me ? "var(--brand)" : "var(--ink-muted)"} textAnchor="middle">{k} {v.toFixed(1)}</text></g>; })}
          </svg><Cap>오른쪽으로 갈수록 이익에 비해 비싸게 거래된다는 뜻이에요.</Cap></>]],
      dir: ["none", "같은 업종 평균보다 높으면 이익에 비해 비싸게, 낮으면 싸게 거래된다는 뜻이에요. 그 자체로 좋고 나쁨은 아니에요."],
      read: "높다는 건 앞으로 이익이 늘 거라는 기대가 가격에 이미 많이 들어가 있다는 뜻이에요. 이익이 기대만큼 늘지 않으면 그만큼 부담이 돼요. 업종마다 보통 수준이 달라서 같은 업종끼리 비교해요.",
      myth: "PER이 낮다고 꼭 싼 건 아니에요. 회사의 앞날을 어둡게 보거나 이익 추정치를 믿지 못하면 PER은 오래 낮게 머물기도 해요." };
  }
  if (key === "range") {
    const X = (v: number) => 10 + (v - F.lo) / (F.hi - F.lo) * (CW - 20);
    return { title: "52주 범위", value: `${usd(F.lo, 1)}~${usd(F.hi, 1)}`, sub: "지난 1년",
      mean: "지난 1년(52주) 동안 가장 낮았던 가격과 가장 높았던 가격이에요.",
      why: "지금 가격이 1년 범위 중 어디쯤인지 감을 잡을 때 써요.",
      blocks: [["지금 위치", <><svg viewBox={`0 0 ${CW} 60`} className="mini">
          <rect x="10" y="26" width={CW - 20} height="8" rx="4" fill="var(--control)" />
          <text x="10" y="54" fontSize="11" fill="var(--ink-muted)">1년 최저 {usd(F.lo)}</text><text x={CW - 10} y="54" fontSize="11" fill="var(--ink-muted)" textAnchor="end">1년 최고 {usd(F.hi)}</text>
          <path d={`M${X(price) - 6} 10 h12 l-6 9 z`} fill="var(--brand)" /><text x={Math.min(X(price), CW - 40)} y="8" fontSize="11.5" fontWeight="700" fill="var(--brand)" textAnchor="middle">지금 {usd(price)}</text>
        </svg><Cap>최고가보다 {Math.abs((price / F.hi - 1) * 100).toFixed(1)}% 아래, 최저가보다 {((price / F.lo - 1) * 100).toFixed(1)}% 위예요.</Cap></>]],
      dir: ["none", "1년 중 어디쯤인지 위치만 알려 줘요."],
      read: "지금 가격이 1년 동안 오간 폭 안에서 아래쪽인지 위쪽인지를 봐요.",
      myth: "최고가 근처라고 비싸고, 최저가 근처라고 싸다는 뜻은 아니에요." };
  }
  if (key === "opm") {
    const gross = 75.1, op = 62.4, sec = 24.9, seg: [string, number, string][] = [["매출원가", 100 - gross, "var(--muted-soft)"], ["판매·관리비 등", gross - op, "var(--hairline-strong)"], ["영업이익", op, "var(--brand)"]];
    return { title: "영업이익률", value: op + "%", sub: `섹터 중앙값 ${sec}%`,
      mean: "매출에서 물건 만드는 데 든 돈과 회사 운영비를 빼고 남은 돈(영업이익)이 매출의 몇 %인지예요.",
      why: "회사가 본업으로 매출에서 얼마를 남기는지 볼 때 써요.",
      blocks: [
        ["계산 재료", <><div className="stack">{seg.map(([t, v, c]) => <span key={t} style={{ width: `${v}%`, background: c }} title={t}></span>)}</div>
          <div className="legend">{seg.map(([t, v, c]) => <span key={t}><i style={{ background: c }}></i>{t} {v.toFixed(1)}</span>)}</div>
          <Cap>매출 100달러를 셋으로 나눈 그림이에요. 파란 부분 {op}달러가 영업이익으로 남았어요.</Cap></>],
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
        ["모양 익히기", <><Svg html={candleShapes()} /><Cap>굵은 몸통은 시작과 끝 사이, 위아래 가는 선(꼬리)은 그날 갔다가 되돌아온 가격이에요.</Cap></>],
        [`${s} 마지막 날 (${md(d.t)})`, <><Svg html={lastDayCandle(d, v => usd(v))} />
          <Cap>{d.c >= d.o ? `시작(${usd(d.o)})보다 ${usd(d.c - d.o)} 높게 끝나서 빨간 양봉이에요.` : `시작(${usd(d.o)})보다 ${usd(d.o - d.c)} 낮게 끝나서 파란 음봉이에요.`}</Cap></>]],
      read: "몸통이 길수록 그날 시작과 끝의 차이가 컸다는 뜻이에요. 꼬리가 길면 장중에 그 가격까지 갔다가 되돌아왔다는 뜻이고요. 국내 앱은 오른 날을 빨강, 내린 날을 파랑으로 그려요(미국 앱은 반대로 초록·빨강을 많이 써요).",
      myth: "양봉이어도 어제보다는 내렸을 수 있어요. 양봉·음봉은 어제 가격이 아니라 그날 시작 가격과 비교한 거예요." };
  }
  if (key === "sup" && D.levels) {
    const { sup, res } = D.levels, W = C.slice(-20), m = n - 20, tch = supportTouches(C, sup).map(i => i - m);
    return { title: "지지선·저항선", value: `지지 ${usd(sup)}`, sub: `저항 ${usd(res)}`,
      mean: "지지선은 가격이 여러 번 내려왔다가 멈추고 다시 올라간 가격대, 저항선은 여러 번 올라갔다가 막힌 가격대예요.",
      why: "그 가격 근처에서 사려는 사람(지지)이나 팔려는 사람(저항)이 많았다는 기록이라, 가격이 그 근처에 왔을 때를 볼 때 써요.",
      blocks: [["최근 20거래일", <><Svg html={supResStrip(W, sup, res, tch)} /><Cap>노란 동그라미가 지지선 근처까지 내려왔다가 올라간 날이에요 ({tch.length}번).</Cap></>]],
      read: "선은 지난 가격의 기록이에요. 종가가 지지선 아래에서 마감하면 '이탈', 저항선 위에서 마감하면 '돌파'라고 불러요.",
      myth: "선이 있다고 그 자리에서 꼭 멈추는 건 아니에요." };
  }
  if (key === "trend") {
    const [tn, td] = trendOf(C), { hi, lo } = pivotsOf(C);
    return { title: "추세", value: tn, sub: "지난 4개월",
      mean: "고점과 저점이 이어지는 방향이에요. 둘 다 높아지면 상승 추세, 둘 다 낮아지면 하락 추세, 한쪽으로 기울지 않으면 횡보라고 불러요.",
      why: "하루하루의 오르내림 대신 몇 주, 몇 달의 큰 흐름을 볼 때 써요.",
      blocks: [["이 종목의 지난 4개월", <><Svg html={trendLine(C, hi, lo)} /><Cap><Dot c="var(--up)" />최근 고점 <Dot c="var(--down)" />최근 저점. {td}.</Cap></>]],
      read: "추세는 지난 고점·저점의 모양에 붙인 이름이에요. 하루 이틀의 오르내림보다 몇 주 단위의 흐름을 볼 때 맞아요.",
      myth: "지금까지 상승 추세였다고 앞으로도 오른다는 뜻은 아니에요." };
  }
  return null;
}
/* 목업 factsOf 의 거래량 글: 1억 주가 넘으면 억, 아니면 만 */
const volText = (n: number) => n >= 1e8 ? `${(n / 1e8).toFixed(2)}억 주` : `${Math.round(n / 1e4).toLocaleString("ko-KR")}만 주`;

/** 카드 본문 (떠 있는 용어 카드와 사이드바 '용어 풀이'가 같이 쓴다) */
export function TermInner({ c }: { c: Card }) {
  return <>
    <dl><dt>뜻</dt><dd>{c.mean}</dd><dt>왜 보나</dt><dd>{c.why}</dd>
      {c.dir ? <><dt>높고 낮음</dt><dd><span className="tag dir">{DIR_NAME[c.dir[0]]}</span> {c.dir[1]}</dd></> : null}</dl>
    {c.blocks.map(([t, h]) => <section key={t}><h4>{t}</h4>{h}</section>)}
    <dl className="read"><dt>읽는 법</dt><dd>{c.read}</dd></dl>
    {c.myth ? <p className="myth"><b>흔한 오해</b>{c.myth}</p> : null}
    {c.note ? <p className="note">{c.note}</p> : null}
  </>;
}

/** ?term= 으로 여는 떠 있는 카드. 누른 자리가 없으면 화면 가운데 위쪽에 붙인다 */
export function TermCard({ D, termKey, onClose }: { D: StockData; termKey: string; onClose: () => void }) {
  const fmt = useFormat(D.fx);
  const course = useCourse();
  const ref = useRef<HTMLDivElement>(null);
  const c = termCardOf(termKey, D, fmt);
  const learn = course.data?.questions.filter(q => q.topic === termKey).length ?? 0;
  useLayoutEffect(() => {
    const card = ref.current; if (!card) return;
    const a = document.querySelector(`[data-term="${CSS.escape(termKey)}"]`);
    const r = a ? a.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: 120, bottom: 120 }, w = card.offsetWidth, h = card.offsetHeight;
    let x = r.left - w - 12; if (x < 12) x = Math.min(r.right + 12, innerWidth - w - 12);
    card.style.left = Math.max(12, x) + "px";
    card.style.top = Math.max(72, Math.min(r.top - 24, innerHeight - h - 12)) + "px";
  });
  if (!c) return null;
  return <div className="termcard" id="termcard" ref={ref} role="dialog" aria-label={`${c.title} 읽는 법`}>
    <div className="tc-head"><div><span className="t-label">{c.title}</span>{c.value ? <b>{c.value}</b> : null}{c.sub ? <small>{c.sub}</small> : null}</div><button className="iconbtn" onClick={onClose} aria-label="닫기"><Ic name="x" /></button></div>
    <TermInner c={c} />
    {learn ? <Link className="tc-learn" to={`/course?topic=${termKey}`}><span><b>실전 차트로 확인하기</b><small>{learn}개</small></span><Ic name="chevR" /></Link> : null}
  </div>;
}

/** 사이드바 '용어 풀이'에서 고른 용어 (목업 drawerLearn 1698~1709). 종목 화면이 아니면 엔비디아 차트로 그린다 */
export function DrawerTerm({ s, lterm, here, onBack, notStock }: { s: string; lterm: string; here: number; onBack: () => void; notStock: boolean }) {
  const D = useStockData(s);
  const fmt = useFormat(D.fx);
  const course = useCourse();
  const c = D.summary ? termCardOf(lterm, D, fmt) : null;
  const learn = course.data?.questions.filter(q => q.topic === lterm).length ?? 0;
  if (!c) return null;
  return <>
    <div className="dw-head"><button className="iconbtn lp-back" onClick={onBack} aria-label="목록으로"><Ic name="chevR" /></button><b>{c.title}</b>{c.value ? <span className="lp-val">{c.value}</span> : null}<span className="spacer"></span></div>
    <div className="dw-body lp-term">
      {here ? <p className="lp-where"><i></i>지금 화면에서 파란 테두리로 표시한 곳이에요.</p> : null}
      {notStock ? <p className="lp-where muted">그림은 엔비디아(NVDA) 차트로 보여 드려요.</p> : null}
      <TermInner c={c} />
      {learn ? <Link className="lp-row lp-course" to={`/course?topic=${lterm}`}><span className="t"><b>실전 차트로 확인하기</b><small>{learn}개</small></span><Ic name="chevR" /></Link> : null}
    </div>
  </>;
}
