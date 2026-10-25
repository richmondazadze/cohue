"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { queryRetry } from "@/client/queries";
import { ErrorToastProvider } from "@/components/ui/error-toasts";

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
      <TooltipProvider delayDuration={400} skipDelayDuration={0}>
        <ErrorToastProvider>{children}</ErrorToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
