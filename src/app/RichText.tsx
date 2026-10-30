/* 데이터에서 온 글(AI 답변, 뉴스, 메모 등)을 그릴 때 쓴다. HTML 은 절대 해석하지 않고, 정해 둔 작은 문법만 React 요소로 바꾼다.
   - **굵게**
   - [[NVDA]]          → 종목 화면 링크 (티커는 대문자·숫자·점만)
   - [보이는 글](/경로) → 같은 사이트 안 링크 (/ 로 시작하고 // 가 아닌 것만)
   그 밖의 글자는 모두 그대로 텍스트로 나간다 */
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

const TOKEN = /\*\*([^*]+)\*\*|\[\[([A-Z0-9.]{1,10})\]\]|\[([^\]]+)\]\((\/(?![\/\\])[A-Za-z0-9\-._~!$&'*+,;=:@%\/?#]*)\)/g;

/** 링크 대상을 한 번 더 확인한다. 같은 출처의 경로만 통과시키고, 정규화한 경로를 돌려준다. 안 되면 null */
export function safeInternalPath(raw: string): string | null {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  try {
    const base = "https://gops.invalid";
    const u = new URL(raw, base);
    if (u.origin !== base) return null;
    const out = u.pathname + u.search + u.hash;
    // 정규화 결과도 다시 검사한다 ("/a/..//evil.com" → "//evil.com")
    return out.startsWith("/") && !out.startsWith("//") && !out.includes("\\") ? out : null;
  } catch {
    return null;
  }
}

export function parseRich(text: string): ReactNode[] {
  const out: ReactNode[] = []; let last = 0, k = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<b key={k++}>{m[1]}</b>);
    else if (m[2] != null) out.push(<Link key={k++} to={`/stock?s=${m[2]}`}>{m[2]}</Link>);
    else {
      const to = safeInternalPath(m[4]);
      out.push(to ? <Link key={k++} to={to}>{m[3]}</Link> : m[0]);
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  return <Fragment>{parseRich(text)}</Fragment>;
}
