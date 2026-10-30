import { useEffect } from "react";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
import { invalidate, useInvalidation } from "./invalidate";
/* D18 최근 본 종목. add 하면 드로어의 최근 본 목록도 다시 읽는다 */
export function useRecent() {
  const ds = useDataSource();
  const res = useResource(() => ds.recent(), [ds]);
  useInvalidation("recent", res.reload);
  const add = useMutation(async (symbol: string) => { await ds.addRecent(symbol); invalidate("recent"); });
  return { ...res, add };
}

/* 종목 화면이 열릴 때 한 번 부른다: useRecordRecentView(symbol). 로그인하지 않았거나 서버가 실패해도 화면은 그대로 둔다 */
export function useRecordRecentView(symbol: string | null | undefined) {
  const ds = useDataSource();
  useEffect(() => {
    const s = symbol?.trim().toUpperCase(); if (!s) return;
    let live = true;
    ds.addRecent(s).then(() => { if (live) invalidate("recent"); }, () => undefined);
    return () => { live = false; };
  }, [ds, symbol]);
}
