"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/onboarding/actions";

const ONBOARDING_INITIAL_STATE: OnboardingActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 w-full bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Finalizando..." : "Finalizar cadastro da empresa"}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useActionState<OnboardingActionState, FormData>(
    completeOnboardingAction,
    ONBOARDING_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="nomeResponsavel" className="block text-sm font-medium text-zinc-200">
          Seu nome
        </label>
        <input
          id="nomeResponsavel"
          name="nomeResponsavel"
          type="text"
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          placeholder="Ex.: Carlos Silva"
          aria-invalid={Boolean(state.fieldErrors?.nomeResponsavel)}
        />
        {state.fieldErrors?.nomeResponsavel ? (
          <p className="text-sm text-amber-300">{state.fieldErrors.nomeResponsavel}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="nomeEmpresa" className="block text-sm font-medium text-zinc-200">
          Nome da empresa
        </label>
        <input
          id="nomeEmpresa"
          name="nomeEmpresa"
          type="text"
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          placeholder="Ex.: Barbearia Premium"
          aria-invalid={Boolean(state.fieldErrors?.nomeEmpresa)}
        />
        {state.fieldErrors?.nomeEmpresa ? (
          <p className="text-sm text-amber-300">{state.fieldErrors.nomeEmpresa}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="telefone" className="block text-sm font-medium text-zinc-200">
          Telefone (opcional)
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="endereco" className="block text-sm font-medium text-zinc-200">
          Endereco (opcional)
        </label>
        <input
          id="endereco"
          name="endereco"
          type="text"
          className="h-11 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          placeholder="Rua, numero e bairro"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="unico-atendente"
          name="unico_atendente"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 accent-amber-400"
        />
        <label htmlFor="unico-atendente" className="text-sm text-zinc-200">
          Sou o único atendente / Atendimento próprio
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Você poderá cadastrar mais funcionários depois, no menu Funcionários.
      </p>

      <SubmitButton />

      {state.message ? (
        <p className={`text-sm ${state.success ? "text-emerald-300" : "text-amber-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
