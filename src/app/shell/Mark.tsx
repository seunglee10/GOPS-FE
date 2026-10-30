/* 종목 로고 네모. 목업 mark()/logoImg()/logoBg() (84~90줄). 로고가 있으면 그림, 없으면 회사 색 바탕에 첫 글자 */
import { HAS_LOGO, logoBg, logoUrl, markColor } from "../../data/logos";

export function Mark({ symbol, color, className = "mark" }: { symbol: string; color?: string | null; className?: string }) {
  if (HAS_LOGO.has(symbol)) {
    const bg = logoBg(symbol, color);
    return <span className={`${className} logo`} style={bg ? { background: bg } : undefined}><img src={logoUrl(symbol)!} alt="" loading="lazy" /></span>;
  }
  return <span className={className} style={{ background: markColor(symbol, color) }}>{symbol[0]}</span>;
}
/* 국내 종목·시장 규칙처럼 로고 파일이 없는 것: 색 바탕에 글자 */
export function LetterMark({ letter, color }: { letter: string; color: string }) {
  return <span className="mark" style={{ background: color }}>{letter}</span>;
}
