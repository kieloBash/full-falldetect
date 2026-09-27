// location: frontend/lib/auth/queries.ts
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as api from "./api";

export const authKeys = {
  me: ["me"] as const,
};

export function useLoginMutation() {
  return useMutation({ mutationFn: api.login });
}

export function useLogoutMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      router.replace("/");
    },
  });
}

export function useProfileMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.fetchProfileMe(),
    staleTime: 5_000,
  });
}
