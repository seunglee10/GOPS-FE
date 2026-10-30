/* 처음 들어온 사람에게 '용어 풀이'를 단계별로 소개 (목업 gops.js 1602~1650, 3322줄). 홈에서 한 번, ?tour=1 로 다시 보기.
   각 단계는 그림 한 장 + 한 줄. 화면의 요소 둘레에 빛(.tour-spot)을 두고 옆에 카드를 붙인다 */
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ic } from "../../app/icons";
import { useQ } from "../../app/query";
import { useSession } from "../../app/session";
import { KEYS, prefs, store } from "../../app/store";
import { hlTopic, topicEls } from "../../app/shell/learn/topics";
/* 목업은 끝낸 표시로 "done" 을 저장했다. 값이 있기만 하면 끝낸 것으로 본다 */
const tourDone = () => !!store.get(KEYS.tour);

const TA_CANDLES = [[30, 46, 26, 40], [40, 44, 33, 35], [35, 50, 34, 48], [48, 56, 45, 52], [52, 54, 41, 43], [43, 47, 38, 46], [46, 60, 45, 58], [58, 62, 50, 51], [51, 55, 47, 54], [54, 66, 53, 64]];
type Step = { sel: () => (HTMLElement | null)[]; open: boolean; demo?: boolean; title: string; body: string; art: () => ReactNode };
const learnRows = () => [...document.querySelectorAll<HTMLElement>("#thread .lp-row[data-topic]")];
const TOUR: Step[] = [
  { sel: () => [document.querySelector<HTMLElement>('#rail [data-tab="learn"]')], open: false, title: "용어 풀이",
    body: "주식 용어의 뜻과 읽는 법을 모아 둔 사전이에요.",
    art: () => <div className="ta ta1"><div className="ta-rail"><i></i><i></i><i className="on"><Ic name="book" /><small>용어 풀이</small></i></div>
      <div className="ta-panel"><b>용어 풀이</b><small>이 화면에 나온 용어</small><span>거래량</span><span>RSI</span><span>PER</span></div></div> },
  { sel: () => { const rows = learnRows(), here = rows.filter(r => r.querySelector(".t small")); return here.length ? here : rows.filter(r => topicEls(r.dataset.topic ?? "").length); }, open: true, demo: true, title: "화면 속 용어 찾기",
    body: "목록에 마우스를 올리면 화면에서 그 용어가 표시돼요.",
    art: () => <div className="ta ta2"><div className="ta-screen"><span className="ta-tag hl">거래량 2.1배</span><span className="ta-tag">52주 고점 근접</span><i className="ta-line"></i><i className="ta-line s"></i></div>
      <div className="ta-list"><span className="on">거래량<small>화면에 2곳</small><svg className="ta-cur" viewBox="0 0 16 16"><path d="M2 1l11 6-5 1.5L6 14z" fill="var(--ink)" stroke="#fff" strokeWidth="1.2" /></svg></span><span>PER</span></div></div> },
  { sel: () => learnRows().slice(0, 1), open: true, title: "뜻과 읽는 법",
    body: "누르면 뜻, 왜 보나, 읽는 법을 그림으로 보여 줘요.",
    art: () => <div className="ta ta3"><div className="ta-head"><b>RSI</b><strong>72</strong></div>
      <div className="ta-gauge"><i className="lo"></i><i className="hi"></i><em style={{ left: "72%" }}></em></div><div className="ta-scale"><span>0</span><span>30</span><span>70</span><span>100</span></div>
      <div className="ta-chips"><span>뜻</span><span>왜 보나</span><span>읽는 법</span></div></div> },
  { sel: () => [document.querySelector<HTMLElement>('[data-act="me"]')], open: false, title: "실전 차트",
    body: "실제로 있었던 차트에서 직접 찾아보며 익히는 문제는 프로필 메뉴에서 열어요. 용어 카드 맨 아래에서도 바로 갈 수 있어요.",
    art: () => { const X = (i: number) => 14 + i * 22, Y = (v: number) => 104 - (v - 20) * 1.9;
      return <div className="ta ta4"><svg viewBox="0 0 240 112">{TA_CANDLES.map(([o, h, l, c], i) => { const col = c >= o ? "var(--up)" : "var(--down)"; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth="1.4" /><rect x={X(i) - 6} y={Y(Math.max(o, c))} width="12" height={Math.max(2, Math.abs(Y(o) - Y(c)))} fill={col} rx="1" /></g>; })}
        <rect x={X(4) - 10} y="4" width="20" height="104" rx="4" fill="var(--ok)" opacity=".16" /><circle cx={X(4)} cy={Y(41) + 9} r="7" fill="none" stroke="var(--ok)" strokeWidth="2" /></svg>
        <div className="ta-badges"><span className="ok"><Ic name="check" />정답</span><span className="hint"><Ic name="spark" />힌트</span></div></div>; } },
];

type Box = { x0: number; y0: number; x1: number; y1: number };
export function Tour() {
  const { q, setQ, dw } = useQ();
  const { guest } = useSession();
  const [i, setI] = useState<number | null>(() => {
    if (new URLSearchParams(window.location.search).get("tour") === "1") prefs.tour.set(false);
    return null;
  });
  const [box, setBox] = useState<Box | null>(null);
  /* 처음 들어온 사람(로그인, 둘러보기 안 끝냄, 대화상자 없음)에게만 */
  useEffect(() => { if (i == null && !guest && !tourDone() && !q("dialog")) setI(0); }, [guest]);   // eslint-disable-line react-hooks/exhaustive-deps
  const step = i == null ? null : TOUR[i];
  const learnOpen = dw() === "learn" && !q("lterm");
  /* 단계마다 사이드바를 열거나 닫는다 */
  useEffect(() => {
    if (!step) return;
    if (step.open && !learnOpen) setQ({ dw: "learn", lterm: null });
    else if (!step.open && dw() === "learn") setQ({ dw: null });
  }, [step, learnOpen, dw, setQ]);
  useLayoutEffect(() => {
    if (!step) { setBox(null); return; }
    let raf = 0;
    const place = () => {
      const els = step.sel().filter((e): e is HTMLElement => !!e); if (!els.length) { setBox(null); return; }
      const R = els.map(e => e.getBoundingClientRect());
      setBox({ x0: Math.min(...R.map(r => r.left)) - 6, y0: Math.min(...R.map(r => r.top)) - 6, x1: Math.max(...R.map(r => r.right)) + 6, y1: Math.max(...R.map(r => r.bottom)) + 6 });
      hlTopic(step.demo ? els[0].dataset.topic ?? null : null);
    };
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { raf = requestAnimationFrame(place); }); };
    later();
    /* 사이드바 목록이 다시 그려지면(화면 속 용어 수를 센 뒤) 자리를 다시 잡는다 */
    const mo = new MutationObserver(later), th = document.getElementById("thread");
    if (th) mo.observe(th, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", later);
    return () => { cancelAnimationFrame(raf); mo.disconnect(); window.removeEventListener("resize", later); };
  }, [step, learnOpen]);
  const go = (n: number | null) => {
    if (n == null) { prefs.tour.set(true); hlTopic(null); if (dw() === "learn") setQ({ dw: null }); }
    setI(n);
  };
  if (!step || !box || (step.open && !learnOpen)) return null;
  const cw = 340, cx = Math.max(16, box.x0 - cw - 16), cy = Math.max(72, Math.min(box.y0, window.innerHeight - 380));
  /* 상단바·레일 위까지 덮어야 해서 body 에 붙인다 (목업도 body 에 #tour 를 붙였다) */
  return createPortal(<div id="tour">
    <div className="tour-spot" style={{ left: box.x0, top: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0 }}></div>
    <div className="tour-card" role="dialog" aria-label="용어 풀이 안내" style={{ left: cx, top: cy, width: cw }}>
      <div className="tour-art">{step.art()}</div>
      <span className="t-caption">{i! + 1} / {TOUR.length}</span><h3>{step.title}</h3><p>{step.body}</p>
      <div className="tour-acts"><button className="btn ghost sm" onClick={() => go(null)}>건너뛰기</button><span className="spacer"></span>
        {i ? <button className="btn outline sm" onClick={() => go(Math.max(0, i - 1))}>이전</button> : null}
        <button className="btn primary sm" onClick={() => go(i === TOUR.length - 1 ? null : i! + 1)}>{i === TOUR.length - 1 ? "시작하기" : "다음"}</button></div>
    </div>
  </div>, document.body);
}
