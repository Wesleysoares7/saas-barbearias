"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateCompanyLogoAction, type UpdateCompanyLogoActionState } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: UpdateCompanyLogoActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Salvando logo..." : "Salvar logo"}
    </Button>
  );
}

export function CompanyLogoForm() {
  const [state, formAction] = useActionState<UpdateCompanyLogoActionState, FormData>(
    updateCompanyLogoAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="mt-3 space-y-3" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="logoFile" className="block text-xs font-medium text-zinc-300">
          Upload da logo
        </label>
        <input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-100 file:mr-3 file:rounded-md file:border-0 file:bg-fuchsia-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fuchsia-100 hover:file:bg-fuchsia-500/30"
        />
        <p className="text-[11px] text-zinc-400">PNG, JPG, WEBP ou SVG. Tamanho maximo: 2MB.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="logoUrl" className="block text-xs font-medium text-zinc-300">
          Ou URL da logo
        </label>
        <input
          id="logoUrl"
          name="logoUrl"
          type="url"
          placeholder="https://seusite.com/logo.png"
          className="h-9 w-full rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 text-xs text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
        />
      </div>

      <SubmitButton />

      {state.message ? (
        <p className={`text-xs ${state.success ? "text-emerald-300" : "text-amber-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
