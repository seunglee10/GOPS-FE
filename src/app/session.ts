/* 로그인 상태. 목업 GUEST (230줄)
   - 목업 모드: ?guest=1 또는 로그아웃한 뒤 저장된 값(gops.guest)
   - api 모드: /api/auth/me 결과(useAuth)만 본다. ?guest=1 은 목업 모드에서만 먹는다 */
import { useAuth } from "../auth/AuthProvider";
import { dataSourceKind } from "../data/source";
import { useQ } from "./query";
import { prefs } from "./store";

export type Session = { guest: boolean; loading: boolean; initials: string; name: string; email: string | null };
export function useSession(): Session {
  const { q } = useQ();
  const auth = useAuth();
  const api = dataSourceKind() === "api";
  const guest = api ? !auth.loading && !auth.user : q("guest") === "1" || prefs.guest.get();
  const name = auth.user?.name || auth.user?.email?.split("@")[0] || "승리";
  return { guest, loading: api && auth.loading, initials: "SL", name, email: auth.user?.email ?? null };
}
