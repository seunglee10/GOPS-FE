/* 인증 화면 공통 조각. 목업 gops.js 3184~3195줄(GOOGLE_G, stepper, pwField, termsBlock), 3275~3293줄(validateAuth, setCheck).
   마크업과 클래스는 목업과 같게 두어 gops.css 가 그대로 먹는다 */
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Ic } from "../app/icons";
import { passwordRules, type AuthMessage, type Consents } from "./emailAuthApi";

export function GoogleG() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>;
}

export function Stepper({ cur, labels }: { cur: number; labels: string[] }) {
  return <ol className="steps3">{labels.map((l, i) => (
    <li key={l} className={i + 1 < cur ? "done" : i + 1 === cur ? "on" : ""}><span>{i + 1 < cur ? <Ic name="check" /> : i + 1}</span>{l}</li>))}</ol>;
}

/* 비밀번호 칸 + 보기 버튼 */
export function PwField({ id, label, value, onChange, invalid }: { id: string; label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return <div className="field"><label htmlFor={id}>{label}</label>
    <div className={`input ${invalid ? "invalid" : ""}`}>
      <input id={id} type={shown ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} autoComplete={id.includes("login") ? "current-password" : "new-password"} aria-invalid={invalid || undefined} />
      <button type="button" className="eye" onClick={() => setShown(s => !s)} aria-label={shown ? "비밀번호 숨기기" : "비밀번호 보기"}><Ic name="eye" /></button>
    </div></div>;
}

/* 입력하는 동안 바로 바뀌는 비밀번호 규칙 */
export function PwRules({ value }: { value: string }) {
  return <ul className="pwrules" id="pwrules">{passwordRules(value).map(r => (
    <li key={r.label} className={r.ok ? "ok" : value ? "no" : ""}>{r.ok ? <Ic name="check" /> : "·"} {r.label}</li>))}</ul>;
}
export function PwMatch({ pw, pw2 }: { pw: string; pw2: string }) {
  return <span className="help" id="pwmatch">{!pw2 ? null : pw2 === pw
    ? <span className="ok"><Ic name="check" /> 비밀번호가 같아요</span>
    : <span className="err"><Ic name="warn" /> 비밀번호가 달라요</span>}</span>;
}

/* 목업의 span.check / button.check. Space·Enter 로도 바꿀 수 있게 한다 */
export function Check({ on, onToggle, className = "check", as = "button", children, req }: { on: boolean; onToggle: () => void; className?: string; as?: "button" | "span"; children: ReactNode; req?: boolean }) {
  const box = <span className="box">{on ? <Ic name="check" /> : null}</span>;
  if (as === "span") {
    const onKey = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } };
    return <span className={className} role="checkbox" aria-checked={on} tabIndex={0} onClick={onToggle} onKeyDown={onKey}>{box}{children}</span>;
  }
  return <button type="button" className={className} role="checkbox" aria-checked={on} data-req={req ? "1" : undefined} onClick={onToggle}>{box}{children}</button>;
}

const TERMS: [keyof Consents, string, boolean][] = [["tos", "[필수] 서비스 이용약관", true], ["privacy", "[필수] 개인정보 수집·이용", true], ["age", "[필수] 만 14세 이상이에요", false], ["mkt", "[선택] 장 시작, 규칙 발동 소식 메일 받기", false]];

/* 약관 4개 + 모두 동의. initial 이 참이면 필수 3개를 켠 채로 시작한다 (목업 termsBlock(checked)) */
export function useTerms(initial: boolean) {
  const [c, setC] = useState<Consents>({ tos: initial, privacy: initial, age: initial, mkt: false });
  const [all, setAll] = useState(initial);
  const toggleAll = () => { const on = !all; setAll(on); setC({ tos: on, privacy: on, age: on, mkt: on }); };
  const toggle = (k: keyof Consents) => setC(prev => { const next = { ...prev, [k]: !prev[k] }; setAll(Object.values(next).every(Boolean)); return next; });
  return { consents: c, all, toggleAll, toggle };
}
export function TermsBlock({ terms }: { terms: ReturnType<typeof useTerms> }) {
  return <div className="terms" id="terms">
    <Check className="check all" on={terms.all} onToggle={terms.toggleAll}><b>모두 동의해요</b></Check>
    {TERMS.map(([k, t, view], i) => <div className="trow" key={k}>
      <Check on={terms.consents[k]} onToggle={() => terms.toggle(k)} req={i < 3}>{t}</Check>{view ? <button type="button" className="view">보기</button> : null}</div>)}
  </div>;
}

/* 오류·완료 배너 */
export function Banner({ tone, msg, children }: { tone: "error" | "ok"; msg: AuthMessage; children?: ReactNode }) {
  return <div className={`banner ${tone}`} role={tone === "error" ? "alert" : "status"}><span><Ic name={tone === "error" ? "alert" : "check"} /></span>
    <span className="grow">{msg.title ? <><b>{msg.title}</b> </> : null}{msg.text}{children}</span></div>;
}

/* 버튼을 막는 이유가 있으면 aria-disabled + 감싼 span 의 data-tip */
export function SubmitWrap({ reason, busy, children }: { reason: string; busy: boolean; children: ReactNode }) {
  return <span id="su-submit-wrap" data-tip={reason || undefined}>
    <button type="submit" className={`btn lg block primary${busy ? " is-loading" : ""}`} id="su-submit" aria-disabled={reason ? "true" : "false"}>{children}</button></span>;
}

export const loadingClass = (busy: boolean) => `btn lg block primary${busy ? " is-loading" : ""}`;
