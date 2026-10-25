"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { queryRetry } from "@/client/queries";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: queryRetry,
            refetchOnWindowFocus: true,
            staleTime: 1000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={400} skipDelayDuration={0}>
          {children}
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
