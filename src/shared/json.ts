// API 응답처럼 신뢰할 수 없는 JSON을 읽을 때 쓰는 공용 가드.
// 각 모듈이 같은 함수를 따로 복사해 두면 정규화 정책이 조용히 갈라지므로,
// 동작이 동일한 가드는 여기 한 벌만 둔다.

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// 값이 공백뿐이면 없는 것으로 취급하고, 남길 때는 양끝 공백을 제거한다.
export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
