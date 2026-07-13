import { COPY } from "@/lib/auth/constants";
import { Icon } from "@/components/icons/Icon";

/** Left-hand dark brand panel: logo, headline, feature bullets, copyright. Static — no props. */
export function BrandPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-slate-900 px-10 py-11">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px 300px at 20% 0%, rgba(13,148,136,.35), transparent 60%)" }}
      />

      <div className="relative">
        <div className="flex items-center gap-[10px]">
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-teal-600">
            <Icon name="shield" size={19} className="text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">{COPY.brandName}</span>
        </div>

        <div className="mt-14 max-w-[340px] text-[26px] font-semibold leading-tight tracking-tight text-white">{COPY.headline}</div>
        <div className="mt-[14px] max-w-[320px] text-sm leading-relaxed text-slate-400">{COPY.subheadline}</div>
      </div>

      <div className="relative flex flex-col gap-[14px]">
        {COPY.features.map((feature) => (
          <div key={feature} className="flex items-center gap-[10px] text-[13px] font-medium text-slate-300">
            <Icon name="check" size={16} className="flex-none text-teal-400" strokeWidth={2.2} />
            {feature}
          </div>
        ))}
        <div className="my-[6px] h-px bg-white/10" />
        <div className="text-xs text-slate-500">{COPY.copyright}</div>
      </div>
    </div>
  );
}
