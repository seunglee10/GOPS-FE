/* 데이터에서 온 글(AI 답변, 뉴스, 메모 등)을 그릴 때 쓴다. HTML 은 절대 해석하지 않고, 정해 둔 작은 문법만 React 요소로 바꾼다.
   - **굵게**
   - [[NVDA]]          → 종목 화면 링크 (티커는 대문자·숫자·점만)
   - [보이는 글](/경로) → 같은 사이트 안 링크 (/ 로 시작하고 // 가 아닌 것만)
   그 밖의 글자는 모두 그대로 텍스트로 나간다 */
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

const TOKEN = /\*\*([^*]+)\*\*|\[\[([A-Z0-9.]{1,10})\]\]|\[([^\]]+)\]\((\/(?!\/)[^)\s]*)\)/g;

export function parseRich(text: string): ReactNode[] {
  const out: ReactNode[] = []; let last = 0, k = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<b key={k++}>{m[1]}</b>);
    else if (m[2] != null) out.push(<Link key={k++} to={`/stock?s=${m[2]}`}>{m[2]}</Link>);
    else out.push(<Link key={k++} to={m[4]}>{m[3]}</Link>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  return <Fragment>{parseRich(text)}</Fragment>;
}
