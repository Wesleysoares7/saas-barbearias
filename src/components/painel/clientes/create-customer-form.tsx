"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createCustomerAction } from "@/app/painel/clientes/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar cliente"}
    </Button>
  );
}

export function CreateCustomerForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createCustomerAction, INITIAL_STATE);

  return (
    <>
      {state.message ? (
        <div className="sticky top-3 z-30 flex justify-center" aria-live="polite">
          <div
            className={`w-full max-w-2xl rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={state.success ? { animation: "customer-toast-fade 3.5s ease forwards" } : undefined}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-cliente-nome" className="text-sm text-zinc-200">
            Nome
          </label>
          <input
            id="novo-cliente-nome"
            name="nome"
            type="text"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Ex.: Joao Silva"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-cliente-telefone" className="text-sm text-zinc-200">
            Telefone
          </label>
          <input
            id="novo-cliente-telefone"
            name="telefone"
            type="text"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-cliente-email" className="text-sm text-zinc-200">
            E-mail
          </label>
          <input
            id="novo-cliente-email"
            name="email"
            type="email"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="cliente@email.com"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-cliente-observacoes" className="text-sm text-zinc-200">
            Observacoes
          </label>
          <textarea
            id="novo-cliente-observacoes"
            name="observacoes"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Preferencias, alergias, anotacoes importantes..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
          <input name="ativo" type="checkbox" defaultChecked className="h-4 w-4 accent-amber-400" />
          Cliente ativo
        </label>

        <div className="md:col-span-2 flex items-center justify-start gap-3">
          <SubmitButton />
        </div>
      </form>

      <style jsx>{`
        @keyframes customer-toast-fade {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
      `}</style>
    </>
  );
}
