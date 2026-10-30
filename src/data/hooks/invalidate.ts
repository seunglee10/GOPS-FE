/* 같은 자원을 여러 컴포넌트가 따로 읽을 때(헤더·드로어·종목 화면), 한 곳에서 바꾸면 모두 다시 읽게 하는 작은 알림판 */
import { useEffect } from "react";

const listeners = new Map<string, Set<() => void>>();
export function invalidate(key: string): void { listeners.get(key)?.forEach(l => l()); }
export function useInvalidation(key: string, reload: () => void): void {
  useEffect(() => {
    const set = listeners.get(key) ?? new Set<() => void>(); listeners.set(key, set);
    set.add(reload); return () => { set.delete(reload); };
  }, [key, reload]);
}
