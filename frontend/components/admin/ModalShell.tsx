// location: frontend/components/admin/ModalShell.tsx
import type { ReactNode } from "react";

export interface ModalShellProps {
  title: string;
  /** e.g. "w-[420px]" — the admin modals use slightly different widths. */
  widthClassName?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Server/validation error shown above the footer (e.g. "A floor with that name already exists."). */
  error?: string | null;
}

/** Shared overlay/panel/animation chrome for the admin add/edit modals. */
export function ModalShell({ title, widthClassName = "w-[420px]", onClose, children, footer, error }: ModalShellProps) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${widthClassName} animate-fd-modal-in rounded-[14px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,.25)]`}
      >
        <div className="text-[17px] font-semibold text-slate-900">{title}</div>
        <div className="mt-4 flex flex-col gap-[14px]">{children}</div>
        {error && (
          <p role="alert" data-testid="modal-error" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-[10px]">{footer}</div>
      </div>
    </div>
  );
}
