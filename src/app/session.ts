/* 로그인 상태. 목업 GUEST (230줄): ?guest=1 또는 로그아웃한 뒤 저장된 값.
   api 모드에서는 /api/auth/me 결과(useAuth)도 본다 */
import { useAuth } from "../auth/AuthProvider";
import { dataSourceKind } from "../data/source";
import { useQ } from "./query";
import { prefs } from "./store";

export type Session = { guest: boolean; loading: boolean; initials: string; name: string; email: string | null };
export function useSession(): Session {
  const { q } = useQ();
  const auth = useAuth();
  const kind = dataSourceKind();
  const apiGuest = kind === "api" && !auth.loading && !auth.user;
  const guest = q("guest") === "1" || prefs.guest.get() || apiGuest;
  const name = auth.user?.name || "승리";
  return { guest, loading: kind === "api" && auth.loading, initials: "SL", name, email: auth.user?.email ?? null };
}
