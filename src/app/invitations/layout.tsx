import type { Metadata } from "next";
import type { ReactNode } from "react";

// Invitation pages never leak their URL (which may carry a bearer token) to other origins or indexes.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function InvitationLayout({ children }: { children: ReactNode }) {
  return children;
}
