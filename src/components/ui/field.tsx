"use client";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cx } from "./cx";

const control =
  "w-full rounded-field border bg-surface px-[14px] py-3 text-base text-ink placeholder:text-muted transition-colors duration-[120ms] min-h-12 disabled:bg-subtle disabled:text-muted";

type FieldProps = {
  label: ReactNode;
  helper?: ReactNode;
  error?: string | string[] | null;
  optional?: boolean;
  className?: string;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
};

export function Field({
  label,
  helper,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const message = Array.isArray(error) ? error.join(" ") : error;
  const describedBy =
    [helper ? helperId : null, message ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="type-compact text-ink">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted">(optional)</span>
        ) : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(message) })}
      {helper ? (
        <p id={helperId} className="type-meta text-muted">
          {helper}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} className="type-meta font-medium text-declined">
          <span aria-hidden="true">− </span>
          {message}
        </p>
      ) : null}
    </div>
  );
}

const border = (invalid?: boolean) =>
  invalid ? "border-declined border-2" : "border-line-control";

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function TextInput({ invalid, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(control, border(invalid), className)}
      {...rest}
    />
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function TextArea({ invalid, className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(control, border(invalid), "resize-y leading-6", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(control, border(invalid), "appearance-none pr-10", className)}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
      >
        ▾
      </span>
    </div>
  );
});

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id: givenId,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="group -m-2.5 grid size-11 shrink-0 place-items-center rounded-button disabled:cursor-not-allowed"
      >
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-compact border border-line-control bg-surface group-data-[state=checked]:border-action group-data-[state=checked]:bg-action">
          <CheckboxPrimitive.Indicator className="text-sm leading-none text-white">✓</CheckboxPrimitive.Indicator>
        </span>
      </CheckboxPrimitive.Root>
      <div className="flex min-h-11 min-w-0 flex-col justify-start">
        <label htmlFor={id} className="cursor-pointer leading-6">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="type-meta text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
