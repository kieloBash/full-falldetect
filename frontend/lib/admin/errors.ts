// location: frontend/lib/admin/errors.ts
/** Turns a mutation error into the message shown in a modal or confirm dialog. */
export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
