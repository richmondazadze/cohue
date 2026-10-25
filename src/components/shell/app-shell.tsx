"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { keys, useDeviceMemory, useSession } from "@/client/queries";
import { useCommand } from "@/client/command";

const NAV = [
  { href: "/missions/new", label: "Start a mission" },
  { href: "/join", label: "Join" },
  { href: "/me", label: "My invitations" },
];

export function Logo({ className }: { className?: string }) {
  return (
    // Fixed vector signature (USAGE.md): never retyped as text, never recolored by status.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/cohue-horizontal.svg"
      alt="COHUE"
      width={152}
      height={51}
      className={cx("block h-auto w-[128px] sm:w-[152px]", className)}
    />
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const memory = useDeviceMemory();
  const session = useSession();
  const showcase = session.data?.scope.executionMode === "SHOWCASE";
  return (
    <header className="sticky top-0 z-20 border-b border-line-subtle bg-canvas/95 backdrop-blur-none">
      <div className="gutter mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 md:py-4">
        <Link href="/" className="-m-2 rounded-button p-2" aria-label="COHUE home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="order-3 -mx-2 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const label =
              item.href === "/join" && memory.participantId
                ? "My profile"
                : item.label;
            const href =
              item.href === "/join" && memory.participantId ? "/me" : item.href;
            if (item.href === "/me" && !memory.participantId) return null;
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 shrink-0 items-center rounded-button px-3 text-sm font-medium no-underline",
                  active ? "bg-selected text-action" : "text-ink hover:bg-hover",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <ModeBadge showcase={showcase} />
      </div>
      {showcase ? <ShowcaseBanner /> : null}
    </header>
  );
}

export function PageFrame({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "reading" | "form" | "wide";
  className?: string;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cx(
        "gutter mx-auto w-full pt-6 pb-24 outline-none md:pt-10",
        width === "reading" && "max-w-[728px]",
        width === "form" && "max-w-[1120px]",
        width === "wide" && "max-w-[1600px]",
        className,
      )}
    >
      {children}
    </main>
  );
}

function ModeBadge({ showcase }: { showcase: boolean }) {
  return showcase ? (
    <span
      className="type-meta rounded-compact border border-pending bg-pending-bg px-2 py-1 font-medium text-pending"
      title="Synthetic showcase: no real people or commitments"
    >
      Showcase · synthetic
    </span>
  ) : (
    <span
      className="type-meta rounded-compact border border-line-control px-2 py-1 font-medium text-muted"
      title="Live mode: real people and real commitments"
    >
      Live
    </span>
  );
}

/** Persistent on every page while the session is in showcase scope. */
function ShowcaseBanner() {
  const client = useQueryClient();
  const router = useRouter();
  const live = useCommand("createSession");
  return (
    <div role="note" className="border-t border-pending bg-pending-bg text-pending">
      <div className="gutter mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span>
          <strong>Synthetic showcase.</strong> Everyone here is a synthetic profile; no real person is contacted or committed.
        </span>
        <button
          type="button"
          className="min-h-11 underline underline-offset-4"
          disabled={live.isPending}
          onClick={() =>
            live.mutate(
              { input: { executionMode: "LIVE", showcaseId: null } },
              {
                onSuccess: (session) => {
                  client.clear();
                  client.setQueryData(keys.session, session);
                  router.push("/");
                },
              },
            )
          }
        >
          {live.isPending ? "Returning to live…" : "Return to live mode"}
        </button>
      </div>
    </div>
  );
}
