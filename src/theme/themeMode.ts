import { useCallback, useEffect, useState } from "react";
import { syncChartEngineThemeFromCss } from "./colors";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const themeStorageKey = "gops:theme";

/* 캔버스 렌더러는 CSS 변수를 직접 읽는다. 테마가 바뀌면 다시 읽어야 하므로
   전환 시점을 이 이벤트로 알린다. useThemeVersion을 참고. */
const themeChangeEvent = "gops:themechange";
const darkQuery = "(prefers-color-scheme: dark)";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemeMode(): ThemeMode {
  const stored = window.localStorage.getItem(themeStorageKey);
  return isThemeMode(stored) ? stored : "light";
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") {
    return mode;
  }
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

/* 실제로 적용된 테마는 DOM 속성이 진실 원천이다. 첫 페인트 전에 index.html의
   부트스트랩이 이 속성을 세팅하므로, 모듈 상태보다 속성을 믿는다. */
export function currentResolvedTheme(): ResolvedTheme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  syncChartEngineThemeFromCss();
  window.dispatchEvent(new CustomEvent(themeChangeEvent));
}

export function setThemeMode(mode: ThemeMode): void {
  window.localStorage.setItem(themeStorageKey, mode);
  applyResolvedTheme(resolveThemeMode(mode));
}

/* 훅을 쓸 수 없는 자리(명령형 렌더 루프 등)에서 전환을 구독한다. */
export function subscribeThemeChange(listener: () => void): () => void {
  window.addEventListener(themeChangeEvent, listener);
  return () => window.removeEventListener(themeChangeEvent, listener);
}

export function useThemeMode(): {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  select: (next: ThemeMode) => void;
} {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(currentResolvedTheme);

  useEffect(() => {
    const sync = () => setResolved(currentResolvedTheme());
    window.addEventListener(themeChangeEvent, sync);
    return () => window.removeEventListener(themeChangeEvent, sync);
  }, []);

  // system 모드일 때만 OS 설정 변경을 따라간다.
  useEffect(() => {
    if (mode !== "system") {
      return;
    }
    const query = window.matchMedia(darkQuery);
    const onChange = () => applyResolvedTheme(resolveThemeMode("system"));
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const select = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    setMode(next);
  }, []);

  return { mode, resolved, select };
}

/* CSS 변수를 직접 읽는 캔버스 렌더러용. 리드로우 useEffect의 deps에 넣으면
   테마 전환에서 다시 그린다. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeThemeChange(() => setVersion((current) => current + 1)), []);
  return version;
}
