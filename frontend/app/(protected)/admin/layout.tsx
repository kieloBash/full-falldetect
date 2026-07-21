import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";

/**
 * One QueryClient shared across all of /admin, /admin/rooms, and
 * /admin/patients. This matters here specifically: those three routes
 * mutate a shared floors/rooms/patients dataset, and each page having its
 * own QueryClient (rather than this layout's shared one) would mean
 * navigating between them re-seeds each query's `initialData` fresh,
 * masking mutations made on a different admin page until the default
 * staleTime lapses.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
