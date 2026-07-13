import axios from "axios";

/**
 * Shared axios instance for the app. Point `NEXT_PUBLIC_API_BASE_URL` at
 * your backend; falls back to same-origin `/api` so it also works behind a
 * Next.js route-handler proxy.
 *
 * Not yet called anywhere — feature API layers (e.g.
 * `lib/live-monitor/api.ts`) currently return mock data. Each has a
 * `TODO(api)` comment showing the exact call to make through this client
 * once a backend exists.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});
