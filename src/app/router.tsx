/* 라우트 13개. 목업의 html 파일 하나 = 라우트 하나. 페이지는 src/pages/<이름>/index.tsx */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell, AuthShell } from "./shell/Shell";
import { PATH, type PageKey } from "./nav";
import HomePage from "../pages/Home";
import MarketPage from "../pages/Market";
import StockPage from "../pages/Stock";
import NewsPage from "../pages/News";
import PortfolioPage from "../pages/Portfolio";
import CalendarPage from "../pages/Calendar";
import CoachPage from "../pages/Coach";
import CoursePage from "../pages/Course";
import LoginPage from "../pages/Login";
import SignupPage from "../pages/Signup";
import VerifyPage from "../pages/Verify";
import GooglePage from "../pages/Google";
import ForgotPage from "../pages/Forgot";
import { RequireLogin } from "../auth/RequireLogin";

const app = (page: PageKey, el: React.ReactNode) => ({ path: PATH[page], element: <Shell page={page}>{el}</Shell> });
const auth = (page: PageKey, el: React.ReactNode) => ({ path: PATH[page], element: <AuthShell page={page}>{el}</AuthShell> });

export const router = createBrowserRouter([
  app("home", <HomePage />),
  app("market", <MarketPage />),
  app("stock", <StockPage />),
  app("news", <NewsPage />),
  app("portfolio", <RequireLogin page="portfolio"><PortfolioPage /></RequireLogin>),
  app("calendar", <CalendarPage />),
  app("coach", <RequireLogin page="coach"><CoachPage /></RequireLogin>),
  app("course", <CoursePage />),
  auth("login", <LoginPage />),
  auth("signup", <SignupPage />),
  auth("verify", <VerifyPage />),
  auth("google", <GooglePage />),
  auth("forgot", <ForgotPage />),
  { path: "*", element: <Navigate to="/" replace /> },
]);
