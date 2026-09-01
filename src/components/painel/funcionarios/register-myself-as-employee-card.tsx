"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { registerMyselfAsEmployeeAction } from "@/app/painel/funcionarios/actions";

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function RegisterButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Cadastrando..." : "Cadastrar-me como funcionario"}
    </Button>
  );
}

export function RegisterMyselfAsEmployeeCard() {
  const [state, formAction] = useActionState<ActionState, FormData>(registerMyselfAsEmployeeAction, INITIAL_STATE);

  if (state.success) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/50 bg-amber-600/10 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-amber-200">Voce ainda nao esta cadastrado como funcionario.</p>
        <p className="text-sm text-amber-200/80">
          Copie seus dados de administrador (nome, e-mail e telefone) para atender clientes tambem.
        </p>
        {state.message ? <p className="text-sm text-amber-100">{state.message}</p> : null}
      </div>

      <form action={formAction}>
        <RegisterButton />
      </form>
    </div>
  );
}
