// location: frontend/lib/api/client.ts
// Replaces the unused axios instance from the TDS (§3.1). Safe to overwrite: nothing imported it yet.
import axios, { AxiosError } from "axios";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.response.use(
  (response) => {
    // If an API call is ever redirected to the login page, axios follows it and
    // gets HTML back. Treat that as an expired session instead of bad data.
    const contentType = String(response.headers["content-type"] ?? "");
    if (response.status !== 204 && !contentType.includes("application/json")) {
      throw new ApiError("Your session has expired. Sign in again.", 401);
    }
    return response;
  },
  (error: AxiosError<{ error?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.error ??
      (status ? `Request failed (${status})` : "Can't reach the server. Check your connection.");
    return Promise.reject(new ApiError(message, status));
  },
);

export default apiClient;
