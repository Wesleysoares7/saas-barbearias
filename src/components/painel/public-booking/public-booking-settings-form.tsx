"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updatePublicBookingSettingsAction,
  type UpdatePublicBookingSettingsActionState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

type PublicBookingSettingsFormProps = {
  initialSlug: string;
  initialEnabled: boolean;
};

const INITIAL_STATE: UpdatePublicBookingSettingsActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar configuracoes"}
    </Button>
  );
}

export function PublicBookingSettingsForm({ initialSlug, initialEnabled }: PublicBookingSettingsFormProps) {
  const [state, formAction] = useActionState<UpdatePublicBookingSettingsActionState, FormData>(
    updatePublicBookingSettingsAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="publicSlug" className="block text-sm font-medium text-zinc-200">
          Identificador publico da empresa
        </label>
        <input
          id="publicSlug"
          name="publicSlug"
          type="text"
          defaultValue={initialSlug}
          placeholder="barbearia-do-centro"
          className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
        />
        <p className="text-xs text-zinc-400">Use apenas letras, numeros e hifen. Ex.: barbearia-premium</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          name="publicBookingEnabled"
          type="checkbox"
          defaultChecked={initialEnabled}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-fuchsia-500 focus:ring-fuchsia-400/40"
        />
        Ativar agendamento publico para clientes
      </label>

      <SubmitButton />

      {state.message ? (
        <p className={`text-sm ${state.success ? "text-emerald-300" : "text-amber-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
