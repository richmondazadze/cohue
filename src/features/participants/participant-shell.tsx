"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useSession } from "@/client/queries";
import "./participants.css";

// Layout adapted from Efferd's free App Shell 2; COHUE's existing Radix primitives supply mobile focus management.
export function ParticipantShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title =
    pathname === "/join" ? "Join the network" : "My profile & invitations";
  return (
    <div
      className={`participant-theme participant-app-shell${collapsed ? " sidebar-collapsed" : ""}`}
    >
      <a href="#main" className="participant-skip">
        Skip to content
      </a>
      <aside className="participant-sidebar" aria-label="Workspace sidebar">
        <SidebarContent pathname={pathname} />
      </aside>
      <div className="participant-shell-main">
        <header className="participant-header">
          <div className="participant-header-inner">
            <div className="participant-breadcrumb">
              <button
                type="button"
                className="sidebar-toggle desktop-toggle"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((v) => !v)}
              >
                <SidebarIcon />
              </button>
              <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="sidebar-toggle mobile-toggle"
                    aria-label="Open navigation"
                  >
                    <SidebarIcon />
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="participant-mobile-overlay" />
                  <Dialog.Content className="participant-theme participant-mobile-sidebar">
                    <Dialog.Title className="sr-only">
                      COHUE navigation
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">
                      Your workspace and profile links.
                    </Dialog.Description>
                    <Dialog.Close
                      className="mobile-nav-close"
                      aria-label="Close navigation"
                    >
                      ×
                    </Dialog.Close>
                    <SidebarContent
                      pathname={pathname}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <span className="breadcrumb-parent">Workspace</span>
              <span className="breadcrumb-slash" aria-hidden="true">
                /
              </span>
              <span>{title}</span>
            </div>
            <span className="participant-session">
              {session.isPending
                ? "Connecting…"
                : session.isError
                  ? "Connection unavailable"
                  : session.data?.scope.executionMode === "SHOWCASE"
                    ? "Synthetic showcase"
                    : "Live workspace"}
            </span>
          </div>
        </header>
        {session.data?.scope.executionMode === "SHOWCASE" ? (
          <div className="participant-mode" role="status">
            Synthetic showcase · Profiles and missions in this space are
            separate from live activity.
          </div>
        ) : null}
        {children}
        <footer className="participant-footer">
          <span>Common ground. Real possibilities.</span>
          <Link href="/">
            Back to COHUE <ArrowIcon />
          </Link>
        </footer>
      </div>
    </div>
  );
}

function SidebarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18" />
    </svg>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className="participant-brand"
        aria-label="COHUE home"
      >
        <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true">
          <g fill="currentColor">
            <path d="M195.88 60.12 A96 96 0 1 0 195.88 195.88 L167.60 167.60 A56 56 0 1 1 167.60 88.40 Z" />
            <rect x="194" y="109" width="38" height="38" rx="4" />
          </g>
        </svg>
        <span>COHUE</span>
      </Link>
      <nav aria-label="Workspace navigation">
        <p className="sidebar-group-label">Workspace</p>
        <Link href="/app" onClick={onNavigate} aria-label="Explore">
          <ParticipantIcon kind="compass" />
          <span>Explore</span>
        </Link>
        <Link
          href="/missions/new"
          onClick={onNavigate}
          aria-label="Start a mission"
        >
          <ParticipantIcon kind="plus" />
          <span>Start a mission</span>
        </Link>
        <p className="sidebar-group-label">Your space</p>
        <Link
          href="/join"
          onClick={onNavigate}
          aria-label="Join the network"
          aria-current={pathname === "/join" ? "page" : undefined}
        >
          <ParticipantIcon kind="person" />
          <span>Join the network</span>
        </Link>
        <Link
          href="/me"
          onClick={onNavigate}
          aria-label="My profile & invitations"
          aria-current={pathname === "/me" ? "page" : undefined}
        >
          <ParticipantIcon kind="inbox" />
          <span>My space</span>
        </Link>
      </nav>
      <div className="sidebar-bottom">
        <p className="sidebar-principle">
          AI coordinates.
          <br />
          <em>People decide.</em>
        </p>
        <p className="sidebar-detail">
          A match is a possibility.
          <br />A commitment is your choice.
        </p>
        <Link href="/" onClick={onNavigate} aria-label="About COHUE">
          <ArrowIcon back />
          <span>About COHUE</span>
        </Link>
      </div>
    </>
  );
}

export function ArrowIcon({ back = false }: { back?: boolean }) {
  return (
    <svg
      className="participant-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={back ? "M19 12H5m7-7-7 7 7 7" : "M5 12h14m-7-7 7 7-7 7"} />
    </svg>
  );
}

export function ParticipantIcon({
  kind,
}: {
  kind: "person" | "inbox" | "check" | "clock" | "compass" | "plus";
}) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    compass: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-6-4-2 6-6 2 2-6 6-2Z",
    person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    inbox: "M4 4h16l2 12v4H2v-4L4 4ZM2 15h6l2 3h4l2-3h6",
    check: "m5 12 4 4L19 6",
    clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
