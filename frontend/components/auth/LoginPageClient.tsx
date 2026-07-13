"use client";

import { useRouter } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthScreen } from "./AuthScreen";

/** Client-side wrapper so `app/login/page.tsx` can stay a server component and export metadata. */
export function LoginPageClient() {
  const router = useRouter();

  return (
    <QueryProvider>
      <AuthScreen onAuthenticated={() => router.push("/live-monitor")} />
    </QueryProvider>
  );
}
