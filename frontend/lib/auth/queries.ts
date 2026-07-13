"use client";

import { useMutation } from "@tanstack/react-query";
import * as api from "./api";

export function useLoginMutation() {
  return useMutation({
    mutationFn: api.login,
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: api.register,
  });
}
