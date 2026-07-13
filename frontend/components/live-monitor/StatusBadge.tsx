import { BADGE_META } from "@/lib/live-monitor/constants";
import type { BadgeSize, BadgeVariant } from "@/lib/live-monitor/types";
import { Icon } from "@/components/icons/Icon";

export interface StatusBadgeProps {
  variant: BadgeVariant;
  /** Overrides the variant's default label (e.g. omit "False alarm" duplication). */
  label?: string;
  size?: BadgeSize;
}

/**
 * Signature status pill. Always pairs an icon with text so state is never
 * conveyed by color alone (WCAG requirement carried over from the spec).
 */
export function StatusBadge({ variant, label, size = "md" }: StatusBadgeProps) {
  const meta = BADGE_META[variant];
  const sm = size === "sm";
  return (
    <span
      className={`inline-flex flex-none items-center gap-[5px] whitespace-nowrap rounded-md font-semibold leading-tight ${meta.bgClass} ${meta.textClass} ${
        sm ? "px-[7px] py-[2px] text-[10px]" : "px-[9px] py-[3px] text-[11px]"
      }`}
    >
      <Icon name={meta.icon} size={sm ? 12 : 13} strokeWidth={2.2} />
      {label ?? meta.label}
    </span>
  );
}
