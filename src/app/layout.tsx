import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "COHUE",
  description: "Multilingual human coordination",
};
// Shared bootstrap only. Frontend Engineer owns this file after assignment activation.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
