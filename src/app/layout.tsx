import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Stage } from "@/components/motion/stage";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/shell/app-shell";
import { LiveAlerts } from "@/components/shell/live-alerts";

export const metadata: Metadata = {
  title: { default: "COHUE", template: "%s · COHUE" },
  description: "From strangers to something extraordinary.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: "#315CCE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fontshare API delivery is the licensed way to use Switzer on the web. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600,700&display=swap"
        />
      </head>
      <body>
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
      </body>
    </html>
  );
}
