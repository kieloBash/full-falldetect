// location: frontend/components/users/PasswordWithGenerate.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ModalTextField } from "@/components/admin/fields/ModalTextField";
import { COPY } from "@/lib/users/constants";

export interface PasswordWithGenerateProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
}

/**
 * Temporary-password input. Shown as plain text on purpose: the admin has to read it
 * out or copy it to give to the user.
 */
export function PasswordWithGenerate({ id, label, value, onChange, onGenerate }: PasswordWithGenerateProps) {
  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <ModalTextField id={id} label={label} value={value} onChange={onChange} placeholder="Temporary password" />
        </div>
        <Button type="button" variant="outline" className="h-[42px]" onClick={onGenerate}>
          {COPY.generate}
        </Button>
      </div>
      <p className="mt-[6px] text-[12px] text-slate-500">{COPY.passwordHint}</p>
    </div>
  );
}
