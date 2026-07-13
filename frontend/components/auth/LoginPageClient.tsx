"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthScreen } from "./AuthScreen";

/**
 * Reads the `?next=` param the auth middleware appends when it redirects an
 * unauthenticated user, so login can send them back where they were headed.
 * `useSearchParams` opts the subtree into client rendering, so it must live
 * inside a <Suspense> boundary (see the wrapper below) or the production
 * build fails to prerender this page.
 */
function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <AuthScreen
      onAuthenticated={() => router.push(searchParams.get("next") ?? "/live-monitor")}
    />
  );
}

/** Client-side wrapper so `app/login/page.tsx` can stay a server component and export metadata. */
export function LoginPageClient() {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <LoginScreen />
      </Suspense>
    </QueryProvider>
  );
}
