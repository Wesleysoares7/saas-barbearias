"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createServiceAction } from "@/app/painel/servicos/actions";

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
      {pending ? "Salvando..." : "Adicionar servico"}
    </Button>
  );
}

export function CreateServiceForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createServiceAction, INITIAL_STATE);

  // Fechar modal após sucesso
  useEffect(() => {
    if (state.success && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
      }, 1500); // Espera 1.5 segundos para mostrar a mensagem de sucesso
      return () => clearTimeout(timer);
    }
  }, [state.success, onSuccess]);

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
            style={state.success ? { animation: "service-toast-fade 3.5s ease forwards" } : undefined}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-servico-nome" className="text-sm text-zinc-200">
            Nome
          </label>
          <input
            id="novo-servico-nome"
            name="nome"
            type="text"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Ex.: Corte masculino"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-servico-duracao" className="text-sm text-zinc-200">
            Duracao (min)
          </label>
          <input
            id="novo-servico-duracao"
            name="duracao"
            type="number"
            min={1}
            step={1}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="45"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-servico-valor" className="text-sm text-zinc-200">
            Valor (R$)
          </label>
          <input
            id="novo-servico-valor"
            name="valor"
            type="number"
            min={0}
            step="0.01"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="50"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
          <input name="ativo" type="checkbox" defaultChecked className="h-4 w-4 accent-amber-400" />
          Servico ativo
        </label>

        <div className="md:col-span-2 flex items-center justify-start gap-3">
          <SubmitButton />
        </div>
      </form>

      <style jsx>{`
        @keyframes service-toast-fade {
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


