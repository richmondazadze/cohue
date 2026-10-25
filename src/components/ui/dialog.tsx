"use client";
import type { ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import * as T from "@radix-ui/react-tabs";
import { cx } from "./cx";

/**
 * Dialog on desktop, bottom sheet on phones (<768px). Radix supplies focus containment, Escape and
 * focus restoration. Visible close button; internal scroll; no drag-only dismissal.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-overlay data-[state=open]:animate-[cohue-fade_240ms_var(--ease-standard)]" />
        <D.Content
          className={cx(
            "fixed z-[60] flex max-h-[92dvh] flex-col bg-surface shadow-float outline-none",
            "inset-x-0 bottom-0 rounded-t-sheet",
            "md:inset-auto md:top-1/2 md:left-1/2 md:w-[min(560px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-panel",
            "data-[state=open]:animate-[cohue-sheet_240ms_var(--ease-standard)]",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 pt-5 pb-4">
            <div className="min-w-0">
              <D.Title className="type-panel">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-muted">
                  {description}
                </D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close
              className="grid size-11 shrink-0 place-items-center rounded-button border border-line-control text-lg hover:bg-hover"
              aria-label="Close"
            >
              ×
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer ? (
            <div className="safe-bottom border-t border-line-subtle px-5 pt-4">
              {footer}
            </div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Tabs({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: { value: string; label: ReactNode; content: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <T.Root value={value} onValueChange={onValueChange} className={className}>
      <T.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-line-subtle"
      >
        {items.map((it) => (
          <T.Trigger
            key={it.value}
            value={it.value}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-medium text-muted data-[state=active]:border-action data-[state=active]:text-ink hover:text-ink"
          >
            {it.label}
          </T.Trigger>
        ))}
      </T.List>
      {items.map((it) => (
        <T.Content key={it.value} value={it.value} className="pt-4 outline-none">
          {it.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
