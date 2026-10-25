"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { LiveAlerts } from "./live-alerts";
import { ParticipantShell } from "@/features/participants/participant-shell";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return <Providers><ParticipantShell>{children}<div className="participant-notifications"><LiveAlerts /></div></ParticipantShell></Providers>;
}
