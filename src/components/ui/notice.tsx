"use client";
import type { ReactNode } from "react";
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
  return (
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
      {d.detail ? <p className="mt-1 text-ink">{d.detail}</p> : null}
      {d.correlationId ? (
        <p className="type-meta mt-1 text-muted">
          Reference {d.correlationId.slice(0, 8)} · {d.code}
        </p>
      ) : (
        <p className="type-meta mt-1 text-muted">{d.code}</p>
      )}
    </Notice>
  );
}
