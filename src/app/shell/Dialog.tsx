/* 대화상자: 규칙 삭제, 로그인 안내, 작성 중 닫기, 투자 경험. 목업 gops.js 596~620줄 */
import { Link } from "react-router-dom";
import type { Actions } from "./actions";
import { backHref } from "./actions";
import { useRules } from "../../data/hooks/useRules";
import { useProfile } from "../../data/hooks/useProfile";
import { prefs } from "../store";

export function Dialog({ act }: { act: Actions }) {
  const k = act.q("dialog");
  if (k === "delete-rule") return <DeleteRule act={act} />;
  if (k === "need-login") {
    const back = encodeURIComponent(backHref());
    return <><h2>로그인이 필요해요</h2><p>주문, 규칙, 관심 종목, AI 질문은 로그인한 뒤에 쓸 수 있어요. 로그인하면 지금 보던 화면으로 돌아와요.</p>
      <div className="actions"><button className="btn ghost" onClick={act.closeDialog}>닫기</button><Link className="btn outline" to="/signup">회원가입</Link><Link className="btn primary" to={`/login?next=${back}`}>로그인</Link></div></>;
  }
  if (k === "leave") {
    return <><h2>작성 중인 주문을 닫을까요?</h2><p>입력한 가격과 수량이 사라져요.</p>
      <div className="actions"><button className="btn ghost" onClick={act.closeDialog}>계속 작성</button><button className="btn danger" onClick={act.discard}>닫기</button></div></>;
  }
  return <ProfileDialog act={act} />;
}

function DeleteRule({ act }: { act: Actions }) {
  const { data } = useRules();
  const r = data?.items.find(x => x.id === act.q("id")) || data?.items[0];
  if (!r) return null;
  return <><h2>이 규칙을 삭제할까요?</h2><p>{r.symbol} {r.condKo} 규칙과 발동 기록이 함께 사라져요. 삭제한 뒤에는 되돌릴 수 없어요. 잠시 멈추려면 끄기를 쓰세요.</p>
    <div className="actions"><button className="btn ghost" onClick={act.closeDialog} autoFocus>취소</button><button className="btn danger-fill" onClick={act.confirmDelete}>규칙 삭제</button></div></>;
}

const EXP = ["new", "some", "pro"] as const;
const STEPS: [string, string][] = [["처음이에요", "캔들, 거래량 같은 말이 아직 낯설어요"], ["몇 번 해 봤어요", "사고팔아 본 적은 있지만 차트는 잘 몰라요"], ["꾸준히 하고 있어요", "차트와 지표를 읽을 줄 알아요"]];
function ProfileDialog({ act }: { act: Actions }) {
  const { data, update } = useProfile();
  const welcome = act.q("welcome") === "1";
  const cur = data?.experience ?? prefs.exp.get() ?? "some";
  const sel = EXP.indexOf(cur);
  return <>
    <span className="t-caption">{act.q("signup") === "1" ? "가입 마지막 단계예요. 한 가지만 여쭤볼게요." : welcome ? "처음 오셨네요. 한 가지만 여쭤볼게요." : "투자 경험 수정"}</span>
    <h2 style={{ marginTop: 8 }}>주식 투자는 얼마나 해 보셨나요?</h2><p>처음이라고 고르면 차트 읽는 법을 실전 차트로 익히는 코스를 안내해 드려요.</p>
    <div className="body"><div className="choice" role="radiogroup">{STEPS.map(([t, d], i) => (
      <button key={t} role="radio" aria-checked={i === sel} onClick={() => { act.exp(EXP[i]); void update.run({ experience: EXP[i] }); }}><span className="o"></span><span><b>{t}</b><small>{d}</small></span></button>))}</div></div>
    <div className="actions"><button className="btn ghost" onClick={act.closeDialog}>{welcome ? "나중에 하기" : "취소"}</button><button className="btn primary" onClick={act.saveProfile}>저장</button></div>
  </>;
}
