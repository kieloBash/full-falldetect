import { COPY } from "@/lib/auth/constants";
import type { UseAuthFormReturn } from "@/lib/auth/useAuthForm";
import { Checkbox } from "./fields/Checkbox";
import { PasswordField } from "./fields/PasswordField";
import { PasswordStrengthMeter } from "./fields/PasswordStrengthMeter";
import { SelectField } from "./fields/SelectField";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";

export interface RegisterFormProps {
  form: UseAuthFormReturn["register"];
  onSwitchToLogin: () => void;
}

/** The "Create account" tab's content: staff details, facility, password with strength meter, and terms agreement. */
export function RegisterForm({ form, onSwitchToLogin }: RegisterFormProps) {
  const facilitiesReady = !form.facilitiesLoading && form.facilityOptions.length > 0;

  return (
    <div className="mt-7 flex flex-1 flex-col">
      <h1 className="m-0 text-[22px] font-semibold tracking-tight text-slate-900">{COPY.registerTitle}</h1>
      <div className="mt-[6px] text-[13.5px] text-slate-600">{COPY.registerSubtitle}</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.onSubmit();
        }}
        className="mt-[22px] flex flex-col gap-[14px]"
      >
        <div className="grid grid-cols-2 gap-3">
          <TextField id="reg-first-name" label="First name" value={form.firstName} onChange={form.onFirstNameChange} placeholder="David" autoComplete="given-name" />
          <TextField id="reg-last-name" label="Last name" value={form.lastName} onChange={form.onLastNameChange} placeholder="Okafor" autoComplete="family-name" />
        </div>

        <TextField id="reg-email" label="Work email" type="email" value={form.email} onChange={form.onEmailChange} placeholder="you@sunrisesenior.com" autoComplete="email" />

        {/* Facilities are fetched from the DB (useFacilities). Until they arrive,
            show a plain-text placeholder in place of the select so the field's
            typing stays untouched. Once loaded, the hook has already defaulted
            `form.facility` to the first option. */}
        {facilitiesReady ? (
          <SelectField
            id="reg-facility"
            label="Facility"
            value={form.facility}
            options={form.facilityOptions}
            onChange={form.onFacilityChange}
          />
        ) : (
          <div>
            <label className="mb-[6px] block text-[12.5px] font-semibold text-slate-700">Facility</label>
            <div className="flex h-11 w-full items-center rounded-[9px] border border-slate-200 bg-slate-50 px-[14px] text-sm text-slate-400">
              {COPY.registerFacilitiesLoading}
            </div>
          </div>
        )}

        <div>
          <PasswordField
            id="reg-password"
            label="Password"
            value={form.password}
            onChange={form.onPasswordChange}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordStrengthMeter score={form.passwordStrength} hasValue={form.password.length > 0} />
        </div>

        {form.error && <div className="text-[12.5px] font-medium text-red-600">{form.error}</div>}

        <Checkbox id="reg-terms" checked={form.agreedToTerms} onChange={form.onToggleTerms} align="start">
          I agree to the{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          , and confirm I am authorized staff at this facility.
        </Checkbox>

        <SubmitButton busy={form.busy}>Create account</SubmitButton>
      </form>

      <div className="flex-1" />

      <div className="mt-[18px] text-center text-[13px] text-slate-600">
        {COPY.hasAccountPrompt}{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSwitchToLogin();
          }}
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
