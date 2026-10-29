/* 모든 읽기 훅의 공통 뼈대. { data, loading, error, reload } 를 돌려준다.
   deps 가 바뀌면 다시 읽고, 늦게 온 응답은 버린다. */
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export type Resource<T> = { data: T | null; loading: boolean; error: Error | null; reload: () => void };

export function useResource<T>(fetcher: () => Promise<T>, deps: DependencyList, enabled = true): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const reload = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const my = ++seq.current;
    setLoading(true); setError(null);
    fetcher().then(v => { if (my === seq.current) { setData(v); setLoading(false); } },
      (e: unknown) => { if (my === seq.current) { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);
  return { data, loading, error, reload };
}

/* 쓰기(뮤테이션) 공통: { run, pending, error } */
export type Mutation<A extends unknown[], R> = { run: (...args: A) => Promise<R>; pending: boolean; error: Error | null };
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>): Mutation<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const run = useCallback(async (...args: A) => {
    setPending(true); setError(null);
    try { return await fn(...args); }
    catch (e) { const err = e instanceof Error ? e : new Error(String(e)); setError(err); throw err; }
    finally { setPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn]);
  return { run, pending, error };
}
