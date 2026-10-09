// 엔진 안에서 신뢰할 수 없는 JSON을 읽을 때 쓰는 가드.
// 앱 쪽 src/shared/json.ts와 같은 역할이지만, 패키지가 앱을 의존하지
// 않도록 여기에 따로 둔다.

export function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
