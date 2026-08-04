"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createTeamInviteAction } from "@/app/painel/equipe/actions";
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
    <Button type="submit" className="h-10 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Criar convite"}
    </Button>
  );
}

export function CreateTeamInviteForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createTeamInviteAction, INITIAL_STATE);

  return (
    <>
      {state.message ? (
        <div className="mb-3" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="invite-email" className="text-sm text-zinc-200">
            E-mail do novo membro
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="usuario@empresa.com"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="invite-role" className="text-sm text-zinc-200">
            Papel
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="employee"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          >
            <option value="employee">Equipe</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <SubmitButton />
        </div>
      </form>
    </>
  );
}
