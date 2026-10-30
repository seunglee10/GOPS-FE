/* 차트 모듈이 만든 SVG 문자열을 그대로 넣는다. 데이터 글은 여기로 넣지 않는다 (모듈 안에서 이스케이프된 그림만) */
export function Svg({ html }: { html: string }) {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}
