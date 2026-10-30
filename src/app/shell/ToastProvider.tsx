/* 토스트: 오류는 사용자가 닫을 때까지 남는다. 목업 gops.js 518~520줄 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastOpts = { action?: string; href?: string; error?: boolean; ms?: number; undo?: () => void };
export type ToastItem = ToastOpts & { id: string; msg: string };
type Ctx = { toasts: ToastItem[]; toast: (msg: string, o?: ToastOpts) => void; clear: () => void };
const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string, o: ToastOpts = {}) => {
    setToasts([{ id: String(Date.now() + Math.random()), msg, ...o }]);
    if (timer.current) clearTimeout(timer.current);
    if (!o.error) timer.current = setTimeout(() => setToasts(t => t.filter(x => x.msg !== msg)), o.ms || 5000);
  }, []);
  const clear = useCallback(() => setToasts([]), []);
  const value = useMemo(() => ({ toasts, toast, clear }), [toasts, toast, clear]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
export function useToast(): Ctx {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}
