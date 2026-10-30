/* 새 앱 셸의 진입점. 목업(gops-web-mock-learn-split)을 옮긴 화면이 여기서 시작한다.
   예전 작업 공간(src/App.tsx, src/layout 등)은 그대로 두되 어떤 라우트에서도 쓰지 않는다. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { DataSourceProvider, createDataSource } from "./data";
import { ToastProvider } from "./app/shell/ToastProvider";
import { router } from "./app/router";
import "./styles/gops.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <DataSourceProvider source={createDataSource()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </DataSourceProvider>
    </AuthProvider>
  </StrictMode>
);
