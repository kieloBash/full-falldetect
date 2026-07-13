import type { LoginFormValues, RegisterFormValues } from "./types";

/**
 * Auth API layer. Mirrors `lib/live-monitor/api.ts`'s shape: these resolve
 * mock data today (with a delay matching the original prototype's demo
 * spinner timing), and each has a `TODO(api)` comment with the exact axios
 * call to make through `@/lib/api/client` once a backend exists.
 */

const MOCK_LATENCY_MS = 900;

function mockDelay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface AuthResult {
  userId: string;
  email: string;
}

export async function login(values: LoginFormValues): Promise<AuthResult> {
  // TODO(api): const { data } = await apiClient.post<AuthResult>("/auth/login", values);
  //            return data;
  return mockDelay({ userId: "mock-user-id", email: values.email });
}

export async function register(values: RegisterFormValues): Promise<AuthResult> {
  // TODO(api): const { data } = await apiClient.post<AuthResult>("/auth/register", values);
  //            return data;
  return mockDelay({ userId: "mock-user-id", email: values.email });
}
