"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * App-wide TanStack Query provider. One `QueryClient` per browser session
 * (the `useState` initializer keeps it stable across re-renders without
 * leaking state across requests on the server).
 *
 * If your app already has a root-level `QueryClientProvider`, use that one
 * instead and drop this wrapper from `app/live-monitor/page.tsx` — a single
 * shared client is what lets navigating between pages reuse the cache.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
