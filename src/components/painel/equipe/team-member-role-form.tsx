"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateMemberRoleAction } from "@/app/painel/equipe/actions";
import { type UserRole } from "@/lib/auth/access";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

type TeamMember = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Salvar papel"}
    </Button>
  );
}

export function TeamMemberRoleForm({
  member,
  isCurrentUser,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateMemberRoleAction, INITIAL_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const shouldShowEditForm = isEditing || (!state.success && Boolean(state.message));

  return (
    <article className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4">
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

      <div className="mb-3">
        <p className="text-sm font-semibold text-zinc-100">{member.nome}</p>
        <p className="text-xs text-zinc-400">{member.email}</p>
      </div>

      {shouldShowEditForm ? (
        <form action={formAction} onSubmit={() => setIsEditing(false)} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <input type="hidden" name="member_id" value={member.id} />

          <div className="space-y-1">
            <label htmlFor={`membro-role-${member.id}`} className="text-sm text-zinc-200">
              Papel de acesso
            </label>
            <select
              id={`membro-role-${member.id}`}
              name="role"
              defaultValue={member.role}
              disabled={isCurrentUser}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400 disabled:opacity-60"
            >
              <option value="admin">Administrador</option>
              <option value="employee">Equipe</option>
            </select>
            {isCurrentUser ? <p className="text-xs text-zinc-500">Seu proprio papel nao pode ser rebaixado.</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <SubmitButton />
            <Button type="button" variant="outline" className="h-9 border-zinc-600 text-zinc-100" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-400">Papel atual</p>
            <p className="text-sm text-zinc-100">{member.role === "admin" ? "Administrador" : "Equipe"}</p>
          </div>

          {!isCurrentUser ? (
            <Button type="button" className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          ) : (
            <p className="text-xs text-zinc-500">Este e seu proprio acesso.</p>
          )}
        </div>
      )}
    </article>
  );
}
