"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/client/hydrated";
import "./error-toasts.css";

type Toast = { id: number; title: string; body: string; review: () => void; leaving?: boolean };
type Push = (message: Omit<Toast, "id" | "leaving"> & { key: string }) => void;
const ErrorToastContext = createContext<Push | null>(null);
export const useErrorToast = () => useContext(ErrorToastContext);

/** Visual companions to persistent, announced ErrorNotices. Never replays a command or steals focus. */
export function ErrorToastProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const serial = useRef(0);
  const seen = useRef(new Map<string, number>());
  const push = useCallback<Push>(({ key, ...message }) => {
    const now = Date.now();
    if (now - (seen.current.get(key) ?? -Infinity) < 30_000) return;
    for (const [k, at] of seen.current) if (now - at >= 30_000) seen.current.delete(k);
    seen.current.set(key, now);
    const toast = { ...message, id: ++serial.current };
    const focusedId = document.activeElement?.closest('[data-error-toast-id]')?.getAttribute('data-error-toast-id');
    setToasts(items => {
      const next = [...items, toast];
      if (next.length > 3) next.splice(next.findIndex(item => String(item.id) !== focusedId), 1);
      return next;
    });
  }, []);
  const dismiss = (id: number) => setToasts(items => items.map(t => t.id === id ? { ...t, leaving: true } : t));
  return <ErrorToastContext.Provider value={push}>{children}{hydrated && createPortal(
    <section className="error-toast-stack" aria-label="Notifications" aria-live="off">
      {toasts.map(toast => <article key={toast.id} className="error-toast" data-error-toast-id={toast.id} data-leaving={toast.leaving || undefined} role="group" aria-label={toast.title} onAnimationEnd={event => {
        if (event.target !== event.currentTarget || !toast.leaving) return;
        if (event.currentTarget.contains(document.activeElement)) toast.review();
        setToasts(items => items.filter(t => t.id !== toast.id));
      }}>
        <svg className="error-toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/></svg>
        <div className="error-toast-copy"><h2>{toast.title}</h2><p>{toast.body}</p></div>
        <button type="button" className="error-toast-close" aria-label={`Dismiss notification: ${toast.title}`} disabled={toast.leaving} onClick={() => dismiss(toast.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </article>)}
    </section>, document.body)}
  </ErrorToastContext.Provider>;
}
