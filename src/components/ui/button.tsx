import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "decline" | "tertiary";

const base =
  "press inline-flex items-center justify-center gap-2 rounded-button font-medium transition-[background-color,border-color,color,transform] duration-[120ms] ease-standard select-none disabled:cursor-not-allowed text-center";
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-white border border-action hover:bg-action-hover hover:border-action-hover active:bg-action-pressed disabled:bg-hover disabled:border-line-panel disabled:text-muted",
  secondary:
    "bg-transparent text-ink border border-line-control hover:bg-hover disabled:text-muted disabled:border-line-panel",
  decline:
    "bg-transparent text-declined border border-declined hover:bg-declined-bg disabled:text-muted disabled:border-line-panel",
  tertiary:
    "bg-transparent text-ink underline underline-offset-[5px] hover:text-action disabled:text-muted px-1!",
};
const sizes = {
  md: "min-h-12 px-5 py-2.5 text-base",
  sm: "min-h-11 px-4 py-2 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: keyof typeof sizes = "md",
  extra?: string,
) {
  return cx(base, variants[variant], sizes[size], extra);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  /** While true the control is disabled and shows the pending verb, e.g. "Saving response…". */
  pending?: boolean;
  pendingLabel?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "secondary",
    size = "md",
    pending = false,
    pendingLabel,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={buttonClass(variant, size, cx("no-underline", className))}
      {...rest}
    >
      {children}
    </Link>
  );
}
