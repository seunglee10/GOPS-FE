import { useEffect, type ReactElement } from "react";

import { safeReturnTo, useAuth, type AuthProviderId } from "./AuthProvider";

function GoogleMark() {
  return (
    <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#000000" d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.74 5.32 4.39 6.74-.15.82-.7 3.03-.8 3.49-.11.55.2.54.42.39.29-.19 3.79-2.58 4.39-3 .5.07 1.01.11 1.52.11 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
    </svg>
  );
}

const PROVIDERS: Array<{ id: AuthProviderId; label: string; mark: () => ReactElement }> = [
  { id: "google", label: "Google 계정으로 로그인", mark: GoogleMark },
  { id: "kakao", label: "카카오 로그인", mark: KakaoMark }
];

export function LoginPage() {
  const { user, loading, error, loginWith } = useAuth();
  const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));

  useEffect(() => {
    // 이미 로그인한 사람이 /login을 열면 머무를 이유가 없다.
    if (!loading && user) {
      window.location.replace(returnTo);
    }
  }, [loading, returnTo, user]);

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-card-header">
          <strong className="login-card-title">GOPS</strong>
          <p className="login-card-subtitle">계속하려면 로그인하세요.</p>
        </header>

        <div className="login-container">
          {PROVIDERS.map(({ id, label, mark: Mark }) => (
            <button
              key={id}
              type="button"
              className={`btn-social btn-${id}`}
              disabled={loading}
              onClick={() => loginWith(id)}
            >
              <Mark />
              <span className="btn-text">{label}</span>
            </button>
          ))}
        </div>

        {error && <p className="login-card-error" role="alert">{error}</p>}

        <a className="login-card-back" href={returnTo}>워크스페이스로 돌아가기</a>
      </section>
    </main>
  );
}
