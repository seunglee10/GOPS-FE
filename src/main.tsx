import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AuthProvider, LOGIN_PATH } from "./auth/AuthProvider";
import { LoginPage } from "./auth/LoginPage";
import { NotificationPreferencesProvider } from "./alerts/notificationPreferences";
import { PaperAccountProvider } from "./orders/PaperAccountProvider";
import { ChartTradeHistoryProvider } from "./orders/ChartTradeHistoryProvider";
import { AiCoachRuntimeProvider } from "./agent/ai-coach/AiCoachRuntimeProvider";
import { syncChartEngineThemeFromCss } from "./theme/colors";
import "./styles.css";
import "./chart-features.css";

syncChartEngineThemeFromCss();

// 로그인 페이지는 워크스페이스 상태(모의계좌·AI 코치·알림 설정)를 하나도 쓰지
// 않는다. 그 프로바이더들을 태우면 로그인 화면에서 불필요한 API 호출이 돈다.
const isLoginRoute = window.location.pathname === LOGIN_PATH;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        {isLoginRoute ? (
          <LoginPage />
        ) : (
          <PaperAccountProvider>
            <AiCoachRuntimeProvider>
              <ChartTradeHistoryProvider>
                <NotificationPreferencesProvider>
                  <App />
                </NotificationPreferencesProvider>
              </ChartTradeHistoryProvider>
            </AiCoachRuntimeProvider>
          </PaperAccountProvider>
        )}
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>
);
