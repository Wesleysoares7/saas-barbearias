"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { removeLogoAction, uploadLogoAction } from "@/app/painel/configuracoes/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

function SubmitButton({ label, pendingLabel, outline }: { label: string; pendingLabel: string; outline?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={outline ? "outline" : "default"}
      className={outline ? "h-11" : "h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300"}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.success
          ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
          : "border-amber-500/50 bg-amber-600/15 text-amber-200"
      }`}
    >
      {state.message}
    </p>
  );
}

export function LogoForm({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  const [uploadState, uploadAction] = useActionState<ActionState, FormData>(uploadLogoAction, INITIAL_STATE);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removeLogoAction, INITIAL_STATE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`Logo de ${companyName}`}
            width={80}
            height={80}
            unoptimized
            className="size-20 rounded-xl border border-border bg-surface object-contain"
          />
        ) : (
          <div
            aria-label="Sem logo"
            className="flex size-20 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-brand-foreground"
          >
            {companyName.trim().slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="text-sm text-muted-foreground">PNG, JPEG ou WEBP, ate 2 MB.</p>
      </div>

      <form action={uploadAction} className="space-y-3">
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          aria-label="Escolher imagem da logo"
          className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm file:text-zinc-100"
        />
        <SubmitButton label="Salvar" pendingLabel="Salvando..." />
        <Feedback state={uploadState} />
      </form>

      {logoUrl ? (
        <form action={removeAction} className="space-y-3">
          <SubmitButton label="Remover logo" pendingLabel="Removendo..." outline />
          <Feedback state={removeState} />
        </form>
      ) : null}
    </div>
  );
}
