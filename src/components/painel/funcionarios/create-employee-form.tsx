"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createEmployeeAction, getMyProfileForEmployeeFormAction } from "@/app/painel/funcionarios/actions";

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
      {pending ? "Salvando..." : "Adicionar funcionario"}
    </Button>
  );
}

export function CreateEmployeeForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createEmployeeAction, INITIAL_STATE);
  const [isFillingMyData, setIsFillingMyData] = useState(false);
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const telefoneInputRef = useRef<HTMLInputElement>(null);

  async function handleFillMyData() {
    setIsFillingMyData(true);

    try {
      const profile = await getMyProfileForEmployeeFormAction();

      if (profile) {
        if (nomeInputRef.current) {
          nomeInputRef.current.value = profile.nome;
        }

        if (telefoneInputRef.current) {
          telefoneInputRef.current.value = profile.telefone;
        }
      }
    } finally {
      setIsFillingMyData(false);
    }
  }

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
            style={state.success ? { animation: "employee-toast-fade 3.5s ease forwards" } : undefined}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-funcionario-nome" className="text-sm text-zinc-200">
            Nome
          </label>
          <input
            id="novo-funcionario-nome"
            name="nome"
            type="text"
            ref={nomeInputRef}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Ex.: Joao"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-funcionario-telefone" className="text-sm text-zinc-200">
            Telefone
          </label>
          <input
            id="novo-funcionario-telefone"
            name="telefone"
            type="tel"
            ref={telefoneInputRef}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-funcionario-percentual" className="text-sm text-zinc-200">
            Comissao (%) (opcional)
          </label>
          <input
            id="novo-funcionario-percentual"
            name="percentual_comissao"
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="40"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-200 md:col-span-2">
          <input name="ativo" type="checkbox" defaultChecked className="h-4 w-4 accent-amber-400" />
          Funcionario ativo
        </label>

        <div className="md:col-span-2 flex items-center justify-start gap-3">
          <Button
            type="button"
            className="h-11 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            onClick={handleFillMyData}
            disabled={isFillingMyData}
          >
            {isFillingMyData ? "Preenchendo..." : "Preencher com meus dados"}
          </Button>
          <SubmitButton />
        </div>
      </form>

      <style jsx>{`
        @keyframes employee-toast-fade {
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
