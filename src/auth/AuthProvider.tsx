import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dataSourceKind } from "../data/source";
import { prefs } from "../app/store";
import { apiEmailAuth, DEMO_USER, mockEmailAuth, type Consents, type EmailAuthClient } from "./emailAuthApi";

export type AuthProviderId = "google" | "kakao";

export type AuthUser = {
  email: string | null;
  name?: string | null;
  picture?: string | null;
  provider: AuthProviderId | "email";
  emailVerified?: boolean;
  /** 소셜 첫 가입이라 약관 동의가 아직 없다. true 면 /google 로 보낸다 */
  needsConsent?: boolean;
  experience?: "new" | "some" | "pro" | null;
};

/** 화면이 쓰는 이메일 인증 동작. 성공하면 로그인 상태(user)를 함께 고친다 */
export type EmailAuthActions = {
  signup: EmailAuthClient["signup"];
  resend: EmailAuthClient["resend"];
  forgot: EmailAuthClient["forgot"];
  /** 로그인·인증 뒤 `/api/auth/me` 를 다시 읽어 needsConsent 까지 채운 사용자를 돌려준다 */
  login: (email: string, password: string, remember: boolean) => Promise<AuthUser | null>;
  verify: (email: string, code: string) => Promise<AuthUser | null>;
  /** 성공하면 서버가 그 사용자의 세션을 전부 지우므로 로그아웃 상태가 된다 */
  reset: (token: string, password: string) => Promise<void>;
  consent: (consents: Consents) => Promise<AuthUser | null>;
};

type AuthContextValue = {
  authEnabled: boolean;
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  /** 로그인 수단을 고르는 `/login` 페이지로 이동한다. */
  login: () => void;
  /** 특정 제공자의 동의 화면으로 바로 넘긴다. 로그인 페이지에서만 쓴다. */
  loginWith: (provider: AuthProviderId, returnTo?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  email: EmailAuthActions;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const LOGIN_PATH = "/login";

/** 같은 출처의 경로만 통과시킨다. `//evil.com`은 브라우저가 외부로 읽는다. */
export function safeReturnTo(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith(LOGIN_PATH)) {
    return "/";
  }
  return trimmed;
}

/**
 * 로그인 후 돌아갈 곳. 로그인 페이지에서 시작했다면 현재 경로가 아니라
 * 쿼리에 실려온 원래 경로로 돌아가야 한다 — 아니면 /login으로 되돌아온다.
 */
function currentReturnTo(): string {
  if (window.location.pathname === LOGIN_PATH) {
    const params = new URLSearchParams(window.location.search);
    return safeReturnTo(params.get("next") ?? params.get("returnTo"));
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

const MOCK_USER: AuthUser = { ...DEMO_USER, provider: "email" };

/**
 * 로그인 상태. api 모드는 쿠키 세션과 `/api/auth/me` 를 쓰고, 목업 모드(VITE_DATA_SOURCE=mock)는
 * 서버를 부르지 않고 데모 사용자("승리")로 둔다. 목업의 로그아웃 상태는 gops.guest 와 ?guest=1 이 정한다(session.ts).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const mock = dataSourceKind() === "mock";
  const [authEnabled, setAuthEnabled] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(mock ? MOCK_USER : null);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    if (mock) { setUser(MOCK_USER); return MOCK_USER; }
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`인증 API 응답 오류 ${response.status}`);
      }
      const payload = await response.json() as unknown;
      const next = normalizeAuthPayload(payload);
      setAuthEnabled(next.authEnabled);
      setUser(next.user);
      return next.user;
    } catch (caught) {
      setAuthEnabled(true);
      setUser(null);
      setError(caught instanceof Error ? caught.message : "인증 상태를 확인하지 못했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [mock]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(returnTo)}`;
  }, []);

  const loginWith = useCallback((provider: AuthProviderId, returnTo?: string) => {
    // 여러 곳에서 onClick 핸들러로 넘어갈 수 있어 MouseEvent가 들어와도 버티게 좁힌다.
    const safeProvider: AuthProviderId = provider === "kakao" ? "kakao" : "google";
    const back = typeof returnTo === "string" ? safeReturnTo(returnTo) : currentReturnTo();
    window.location.href = `/api/auth/${safeProvider}/login?returnTo=${encodeURIComponent(back)}`;
  }, []);

  const logout = useCallback(async () => {
    if (mock) { prefs.guest.set(true); return; }
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok && response.status !== 204) {
        throw new Error(`로그아웃 API 응답 오류 ${response.status}`);
      }
      setUser(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그아웃에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [mock]);

  const email = useMemo<EmailAuthActions>(() => {
    const client = mock ? mockEmailAuth : apiEmailAuth;
    /* 목업은 로그인하면 gops.guest 를 지운다 (목업 3548·3551·3552줄) */
    const signedIn = async (): Promise<AuthUser | null> => { if (mock) prefs.guest.set(false); return refresh(); };
    return {
      signup: (e, p, c) => client.signup(e, p, c),
      resend: e => client.resend(e),
      forgot: e => client.forgot(e),
      async login(e, p, remember) { await client.login(e, p, remember); return signedIn(); },
      async verify(e, code) { await client.verify(e, code); return signedIn(); },
      async reset(token, p) { await client.reset(token, p); if (mock) prefs.guest.set(true); else setUser(null); },
      async consent(c) { await client.consent(c); return signedIn(); },
    };
  }, [mock, refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    authEnabled,
    user,
    loading,
    error,
    login,
    loginWith,
    logout,
    refresh,
    email
  }), [authEnabled, email, error, loading, login, loginWith, logout, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

/**
 * 브라우저에 남는 사용자별 로컬 상태(AI 코치·모의계좌 캐시)를 가르는 키.
 * 카카오처럼 이메일을 주지 않는 제공자가 있어 이메일 하나로는 부족하다.
 * 내부 app_user_id는 공개 payload에 싣지 않으므로 여기서 쓸 수 없다.
 */
export function accountKeyOf(user: AuthUser | null): string {
  if (!user) {
    return "";
  }
  const identity = user.email?.trim().toLowerCase() || user.name?.trim().toLowerCase() || "";
  return identity ? `${user.provider}:${identity}` : "";
}

function normalizeAuthPayload(payload: unknown): { authEnabled: boolean; user: AuthUser | null } {
  if (!payload || typeof payload !== "object") {
    return { authEnabled: false, user: null };
  }
  const source = payload as Record<string, unknown>;
  return {
    authEnabled: source.authEnabled === true,
    user: normalizeUser(source.user)
  };
}

function normalizeUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  // 로그인 여부를 아는 쪽은 서버다. `/api/auth/me`가 미로그인일 때 user: null을
  // 주므로 위쪽 검사로 충분하다. 이메일 유무로 판정하면 이메일을 주지 않는
  // 카카오 계정이 로그아웃 상태로 보인다.
  const source = value as Record<string, unknown>;
  const exp = source.experience;
  return {
    email: typeof source.email === "string" && source.email.trim() ? source.email : null,
    name: typeof source.name === "string" ? source.name : null,
    picture: typeof source.picture === "string" ? source.picture : null,
    provider: source.provider === "kakao" ? "kakao" : source.provider === "email" ? "email" : "google",
    emailVerified: source.emailVerified === true,
    needsConsent: source.needsConsent === true,
    experience: exp === "new" || exp === "some" || exp === "pro" ? exp : null
  };
}
