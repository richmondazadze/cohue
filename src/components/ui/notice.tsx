"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useErrorToast } from "./error-toasts";
import { describeError } from "@/client/errors";
import { Button } from "./button";
import { cx } from "./cx";

type NoticeTone = "info" | "pending" | "declined" | "approved";
const tones: Record<NoticeTone, string> = {
  info: "bg-selected text-ink border-action",
  pending: "bg-pending-bg text-pending border-pending",
  declined: "bg-declined-bg text-declined border-declined",
  approved: "bg-approved-bg text-approved border-approved",
};

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={cx(
        "border-l-[3px] px-4 py-3 text-sm leading-5",
        tones[tone],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Honest error state for a failed request. No fixture fallback, no stack traces. */
export function ErrorNotice({
  error,
  onRetry,
  className,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}) {
  const d = describeError(error);
  const id = useId();
  const notice = useRef<HTMLDivElement>(null);
  const push = useErrorToast();
  useEffect(() => {
    // A modal's inline alert stays inside its focus scope; no competing toast controls outside it.
    if (!push || notice.current?.closest('[role="dialog"]')) return;
    push({ key: `${d.code}:${d.title}`, title: d.title, body: d.body, review: () => {
      const element = notice.current;
      if (!element?.isConnected) return;
      element.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? "auto" : "smooth", block: "center" });
      element.focus({ preventScroll: true });
    }});
  }, [error, push, d.code, d.title, d.body]);
  return (
    <div ref={notice} id={id} tabIndex={-1} className="error-notice-anchor">
    <Notice
      tone="declined"
      role="alert"
      title={title ?? d.title}
      className={className}
      action={
        onRetry && d.retryable !== false ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : onRetry ? (
          <Button size="sm" variant="tertiary" onClick={onRetry}>
            Check again
          </Button>
        ) : null
      }
    >
      <p>{d.body}</p>
      <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer py-2">Support details</summary><p>Reference: {d.correlationId?.slice(0, 8) ?? "Not available"}</p><p>Code: {d.code}</p></details>
    </Notice>
    </div>
  );
}
