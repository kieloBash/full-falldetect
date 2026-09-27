// location: frontend/lib/users/queries.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { CreateUserValues, UpdateUserValues } from "./types";

export const userKeys = {
  all: ["admin", "users"] as const,
};

export function useUsersQuery() {
  return useQuery({ queryKey: userKeys.all, queryFn: api.fetchUsers });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateUserValues) => api.createUser(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: UpdateUserValues }) => api.updateUser(userId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => api.resetPassword(userId, password),
  });
}
