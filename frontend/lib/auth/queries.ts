"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as api from "./api";

export function useLoginMutation() {
  return useMutation({ mutationFn: api.login });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: api.register });
}

export function useLogoutMutation() {
  const router = useRouter();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      router.replace("/")
    }
  });
}

/**
 * Replaces the old hardcoded `FACILITY_OPTIONS` constant. Facilities are
 * stable, so cache them generously.
 */
export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: api.fetchFacilities,
    staleTime: 1000 * 60 * 60,
  });
}
