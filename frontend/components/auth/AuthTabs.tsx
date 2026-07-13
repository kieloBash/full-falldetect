import type { AuthMode } from "@/lib/auth/types";

export interface AuthTabsProps {
  mode: AuthMode;
  onShowLogin: () => void;
  onShowRegister: () => void;
}

function tabClass(active: boolean) {
  return `rounded-lg px-4 py-[7px] text-[13px] font-semibold transition-colors ${
    active ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "bg-transparent text-slate-600"
  }`;
}

/**
 * Sign in / Create account segmented control. Matches the source prototype:
 * it stays visible even during the success screen (clicking a tab there
 * jumps straight into that form, skipping the confirmation).
 */
export function AuthTabs({ mode, onShowLogin, onShowRegister }: AuthTabsProps) {
  return (
    <div className="inline-flex w-fit gap-[2px] self-start rounded-[10px] bg-slate-100 p-[3px]">
      <button type="button" onClick={onShowLogin} className={tabClass(mode === "login")}>
        Sign in
      </button>
      <button type="button" onClick={onShowRegister} className={tabClass(mode === "register")}>
        Create account
      </button>
    </div>
  );
}
