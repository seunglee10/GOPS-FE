/* AI 질문 패널: 답변은 레이아웃과 상관없이 항상 여기 남는다. 목업 gops.js 295~336(제안), 364~366(예시), 415~504(패널), 3351~3357(보내기·고르기) */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Ic, type IconName } from "../icons";
import { useFormat } from "../format";
import { RichText } from "../RichText";
import type { PageKey } from "../nav";
import { useAgentChat } from "../../data/hooks/useAgentChat";
import { EXAMPLES, PROGRESS_STEPS, PROGRESS_NOW, STOP_TOAST, SUGGESTION_DESC, suggestions, type Suggestion } from "../../data/mock/ai";
import type { AgentMessage, AgentView } from "../../api/types";
import type { Actions } from "./actions";

/* 대화 상자 위 꼬리표: 지금 보는 화면 */
export function contextChips(page: PageKey, q: (k: string) => string | null): string[] {
  const s = (q("s") || "NVDA").toUpperCase();
  const map: Partial<Record<PageKey, string[]>> = { home: ["홈 화면"], market: ["S&P 500 지도"], stock: [s, q("tab") === "company" ? "기업 정보" : q("tab") === "news" ? "뉴스" : "일봉 차트"], portfolio: ["내 계좌"], coach: ["9월 복기"] };
  return map[page] || [];
}

export function Thread({ page, act }: { page: PageKey; act: Actions }) {
  const { q, setQ, ag } = act;
  const a = ag() || "new";
  const chat = useAgentChat();
  const ctx = page === "stock" ? (q("s") || "NVDA").toUpperCase() : "NVDA";
  const [value, setValue] = useState(q("ask") ?? "");
  const [sel, setSel] = useState(0);
  const [focused, setFocused] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const ask = q("ask");
  useEffect(() => { if (ask != null) { setValue(ask); inp.current?.focus(); } }, [ask]);
  // 답변이 길면 맨 아래로 내리지 않고 마지막 질문을 위에 맞춰, 결론 줄부터 읽게 한다
  useLayoutEffect(() => {
    const b = body.current; if (!b || a === "new") return;
    const last = [...b.querySelectorAll(".msg-user")].pop();
    b.scrollTop = last ? b.scrollTop + last.getBoundingClientRect().top - b.getBoundingClientRect().top - 16 : b.scrollHeight;
  }, [a]);

  const list = suggestions(value, page, ctx);
  const open = (focused || ask != null) && !!value.trim();
  const askAgent = () => {
    setQ({ ask: null, agent: "loading" });
    chat.ask.run(value, { page, symbol: page === "stock" ? ctx : null, chips: contextChips(page, q) }).then(() => setQ({ agent: "1" }), () => { /* 멈춤 */ });
  };
  const pick = (i: number) => {
    if (act.requireLogin("pick")) return;
    const x = list[i]; if (!x) return;
    setValue(""); inp.current?.blur();
    if (x.kind === "go") return act.go(x.href);
    if (x.kind === "rule") return setQ({ ask: null, sheet: "rule", rs: ctx, price: null, from: null });
    if (x.kind === "order") return setQ({ ask: null, sheet: "order", rs: ctx, side: "buy", price: null, qty: null });
    if (x.kind === "star") { setQ({ ask: null }); return act.toast(`${ctx}을 관심 종목에 추가했어요.`, { action: "실행 취소" }); }
    askAgent();
  };
  const send = () => {
    if (act.requireLogin("send")) return;
    if (a === "loading") { chat.stop(); setQ({ agent: "new" }); act.toast(STOP_TOAST); }
    else if (value.trim()) pick(sel);
  };
  const example = (t: string) => { if (act.requireLogin("example")) return; setValue(t); setSel(0); inp.current?.focus(); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = list.length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); setSel((sel + 1) % n); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); setSel((sel - 1 + n) % n); }
    else if (e.key === "Enter" && n) { e.preventDefault(); pick(sel); }
    else if (e.key === "Escape") { setValue(""); inp.current?.blur(); }
  };
  const ctxName = contextChips(page, q).join(", ") || "지금 화면";
  const loading = a === "loading";
  const ph = page === "stock" ? `${ctx}에 대해 묻거나 일을 시켜 보세요` : "궁금한 점을 묻거나 일을 시켜 보세요";
  const msgs = chat.thread.data?.messages ?? [];
  const user = msgs.find((m): m is Extract<AgentMessage, { role: "user" }> => m.role === "user");
  const view = msgs.find((m): m is Extract<AgentMessage, { role: "assistant" }> => m.role === "assistant")?.view;
  const hist = user ? <><div className="day">{user.at}</div><div className="msg-user">{user.text}</div><div className="msg-ctx">{user.ctx.map(c => <span key={c} className="tag">{c}</span>)}</div></> : null;

  return <>
    <div className="thread-head"><b><Ic name="spark" /> AI 질문</b>{a === "new" ? null : <button className="btn sm ghost">{chat.threads.data?.items[0]?.title ?? "NVDA 대화"} <span className="soft">▾</span></button>}<span className="spacer"></span>
      <button className="iconbtn" onClick={act.newThread} data-tip="새 대화" aria-label="새 대화"><Ic name="plus" /></button>
    </div>
    <div className="thread-body" ref={body}>
      {a === "new" ? (
        <div className="tempty">
          <span className="ic"><Ic name="spark" /></span>
          <h3>무엇이든 물어보세요</h3>
          <p>{ctxName}을 함께 보고 답해요. 알림이나 주문 같은 일도 시킬 수 있지만, 실행은 확인을 받은 뒤에만 해요.</p>
          <div className="examples">{(EXAMPLES[page] || EXAMPLES.stock).map(t => <button key={t} onClick={() => example(t)}>{t}</button>)}</div>
        </div>
      ) : loading ? (<>
        {hist}
        <div className="progress" aria-live="polite">
          {PROGRESS_STEPS.map((s, i) => i < PROGRESS_NOW ? <div key={s} className="done"><Ic name="check" /> {s}</div> : i === PROGRESS_NOW ? <div key={s} className="now"><span className="spinner"></span> {s}</div> : <div key={s}>{s}</div>)}
        </div>
        <p className="t-caption" style={{ margin: 0 }}>보통 10초 안에 끝나요. 다른 화면으로 옮겨도 답변은 이 대화에 남아요.</p>
      </>) : (<>
        {hist}
        {view ? <Answer view={view} act={act} /> : null}
        {view ? <Next view={view} act={act} /> : null}
      </>)}
    </div>
    <div className="composer">
      <div id="suggest">{open ? <Suggest list={list} sel={sel} onPick={pick} /> : null}</div>
      <div className="ctxchips">{contextChips(page, q).map(c => <span key={c} className="refchip">{c}<button aria-label={`${c} 빼기`}><Ic name="x" /></button></span>)}</div>
      <div className="cbox"><input id="agentinput" ref={inp} autoComplete="off" placeholder={ph} aria-label="AI에게 질문하거나 일 시키기" disabled={loading} value={value}
        onChange={e => { setValue(e.target.value); setSel(0); if (ask != null) setQ({ ask: null }); }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onKeyDown={onKey} />
        <button className={`send ${loading ? "stop" : ""}`} id="sendbtn" onClick={send} aria-label={loading ? "답변 중단" : "보내기"}><Ic name={loading ? "stop" : "send"} /></button></div>
    </div>
  </>;
}

function Suggest({ list, sel, onPick }: { list: Suggestion[]; sel: number; onPick: (i: number) => void }) {
  const cmds = list.filter(x => x.kind !== "ask"), ask = list.find(x => x.kind === "ask");
  const icon: Record<Suggestion["kind"], IconName> = { go: "arrowR", rule: "bell", order: "cart", star: "star", ask: "spark" };
  const item = (x: Suggestion) => { const i = list.indexOf(x); return <button key={i} className={`it ${x.kind === "ask" ? "ask" : ""}`} role="option" onMouseDown={e => e.preventDefault()} onClick={() => onPick(i)} aria-selected={i === sel}><span className="ic"><Ic name={icon[x.kind]} /></span><span>{x.label}{x.kind === "ask" ? <span className="sub">{x.sub}</span> : null}</span><small>{x.meta || ""}</small></button>; };
  return <div className="suggest" role="listbox">
    {cmds.length ? <><div className="grp">바로 실행</div>{cmds.map(item)}</> : null}
    <div className="grp">질문</div>{ask ? item(ask) : null}</div>;
}

function Answer({ view, act }: { view: AgentView; act: Actions }) {
  const fmt = useFormat();
  return <article className="ans">
    <p className="ans-lead"><RichText text={fmt.t(view.conclusion)} /></p>
    {view.sections.map(sec => <section key={sec.title} className="ans-sec">
      <div className="ans-h"><h5>{sec.title}</h5>{sec.evidence.map(e => <button key={e.ref} className="src" onClick={() => act.ref(e.kind)}>{e.label}</button>)}</div>
      {sec.kv ? <dl className="ans-kv">{sec.kv.map(r => <div key={r.k}><dt>{r.k}</dt><dd>{fmt.t(r.v)}{r.sub ? <small>{r.sub}</small> : null}</dd></div>)}</dl> : null}
      {sec.body ? <p><RichText text={fmt.t(sec.body)} /></p> : null}
    </section>)}
    <details className="ans-steps"><summary><span className="conf"></span>근거 {view.evidenceCount}곳, 확신 {view.confidence}<span className="spacer"></span>확인 과정</summary>
      <ol>{view.steps.map(s => <li key={s}>{s}</li>)}</ol></details>
  </article>;
}

function Next({ view, act }: { view: AgentView; act: Actions }) {
  const fmt = useFormat();
  return <div className="next">
    <h5>이어서 할 수 있는 일</h5>
    {view.suggestions.map((s, i) => {
      if (s.kind === "rule") {
        if (act.q("done") === "rule") return <div key={i} className="proposal done"><h4>{fmt.t(s.label)}</h4><p className="ok"><Ic name="check" /> 규칙을 만들었어요</p></div>;
        return <div key={i} className="proposal"><h4>{fmt.t(s.label)}</h4><p>{SUGGESTION_DESC.rule}</p>
          <div className="row"><button className="btn sm primary" onClick={() => act.rule({ s: s.payload.symbol, price: s.payload.price, from: "agent" })}>규칙 만들기</button><button className="btn sm ghost">괜찮아요</button></div></div>;
      }
      return <div key={i} className="proposal"><h4>{s.label}</h4><p>{SUGGESTION_DESC.compare}</p>
        <div className="row"><Link className="btn sm outline" to={`/stock?s=${s.symbols[0]}&tab=compare&agent=1`}>비교 탭 열기</Link><button className="btn sm ghost">괜찮아요</button></div></div>;
    })}
  </div>;
}
