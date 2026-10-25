"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Stage } from "@/components/motion/stage";
import { Providers } from "@/components/providers";
import { AppHeader } from "./app-shell";
import { LiveAlerts } from "./live-alerts";
import { ParticipantShell } from "@/features/participants/participant-shell";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  if (pathname === "/join" || pathname === "/me")
    return (
      <Providers>
        <ParticipantShell>
          {children}
          <div className="participant-notifications"><LiveAlerts /></div>
        </ParticipantShell>
      </Providers>
    );
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[80] rounded-button bg-surface px-4 py-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Providers>
        <AppHeader />
        <Stage>{children}</Stage>
        <LiveAlerts />
      </Providers>
    </>
  );
}
