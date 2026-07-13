import type { Toast } from "@/lib/live-monitor/types";

export interface ToastStackProps {
  toasts: Toast[];
}

/** Bottom-right transient confirmations for every response action (acknowledge, resolve, false alarm, reconnect...). */
export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-[10px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fd-toast-in flex max-w-[340px] items-center gap-[10px] rounded-[10px] border border-slate-200 bg-white px-[15px] py-3 shadow-[0_12px_32px_rgba(15,23,42,.16)]"
        >
          <span className={`h-2 w-2 flex-none rounded-full ${t.dot}`} />
          <span className="text-[13px] font-medium text-slate-900">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
