import type { ReactNode } from "react";

export interface SubmitButtonProps {
  busy: boolean;
  children: ReactNode;
}

/** Primary teal submit button with a spinner swap-in while its mutation is pending. */
export function SubmitButton({ busy, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={`mt-1 flex h-[46px] items-center justify-center gap-2 rounded-[9px] border-none text-[14.5px] font-semibold text-white ${
        busy ? "cursor-wait bg-teal-700" : "cursor-pointer bg-teal-600 hover:bg-teal-700"
      }`}
    >
      {busy ? <span className="h-4 w-4 animate-fd-spin rounded-full border-2 border-white/40 border-t-white" /> : children}
    </button>
  );
}
