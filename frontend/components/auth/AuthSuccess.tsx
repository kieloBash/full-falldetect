import { COPY } from "@/lib/auth/constants";
import type { DoneKind } from "@/lib/auth/types";
import { Icon } from "@/components/icons/Icon";

export interface AuthSuccessProps {
  kind: DoneKind;
  onContinue: () => void;
}

/** Confirmation screen shown after a successful sign-in or registration. */
export function AuthSuccess({ kind, onContinue }: AuthSuccessProps) {
  return (
    <div className="mt-7 flex flex-1 flex-col items-center justify-center gap-[14px] text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-green-200 bg-green-50">
        <Icon name="check" size={26} className="text-green-600" strokeWidth={2.4} />
      </div>
      <div className="text-[19px] font-semibold text-slate-900">{COPY.doneTitle[kind]}</div>
      <div className="max-w-[300px] text-[13.5px] leading-relaxed text-slate-600">{COPY.doneSubtitle[kind]}</div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 h-11 rounded-[9px] border-none bg-teal-600 px-[22px] text-sm font-semibold text-white hover:bg-teal-700"
      >
        {COPY.continueLabel}
      </button>
    </div>
  );
}
