import type { ReactNode } from "react";

export interface ModalShellProps {
  title: string;
  /** e.g. "w-[420px]" — the two admin modals use slightly different widths. */
  widthClassName?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

/** Shared overlay/panel/animation chrome for AddFloorModal and AddEditRoomModal. */
export function ModalShell({ title, widthClassName = "w-[420px]", onClose, children, footer }: ModalShellProps) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${widthClassName} animate-fd-modal-in rounded-[14px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,.25)]`}
      >
        <div className="text-[17px] font-semibold text-slate-900">{title}</div>
        <div className="mt-4 flex flex-col gap-[14px]">{children}</div>
        <div className="mt-5 flex justify-end gap-[10px]">{footer}</div>
      </div>
    </div>
  );
}
