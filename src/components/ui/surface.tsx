import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** White reading/control panel on the warm canvas. Rules and whitespace instead of nested cards. */
export function Panel({
  className,
  children,
  as: Tag = "section",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return (
    <Tag
      className={cx(
        "rounded-panel border border-line-panel bg-surface",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Skeleton({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cx("rounded-field bg-hover", className)}
    />
  );
}

export function KeyValue({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-line-subtle py-3 last:border-b-0 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-6">
      <dt className="eyebrow max-w-full shrink-0 break-words">{label}</dt>
      <dd className="m-0 min-w-0 max-w-full break-words text-ink sm:text-right">{children}</dd>
    </div>
  );
}

export function Chip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-control bg-surface pl-3 text-sm">
      <span className="py-1.5">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid size-11 -my-2 place-items-center rounded-full text-muted hover:text-declined"
        >
          ×
        </button>
      ) : (
        <span className="pr-3" />
      )}
    </span>
  );
}
