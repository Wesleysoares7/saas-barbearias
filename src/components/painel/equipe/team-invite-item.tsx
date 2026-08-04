"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { revokeTeamInviteAction } from "@/app/painel/equipe/actions";
import { Button } from "@/components/ui/button";
import { type UserRole } from "@/lib/auth/access";

type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

type TeamInviteItem = {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  token: string;
  expiresAt: string;
};

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function RevokeButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="h-9 border-zinc-600 text-zinc-100" disabled={pending}>
      {pending ? "Revogando..." : "Revogar"}
    </Button>
  );
}

function getStatusLabel(status: InviteStatus): string {
  if (status === "accepted") {
    return "Aceito";
  }

  if (status === "revoked") {
    return "Revogado";
  }

  if (status === "expired") {
    return "Expirado";
  }

  return "Pendente";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function TeamInviteItem({ invite }: { invite: TeamInviteItem }) {
  const [state, revokeAction] = useActionState<ActionState, FormData>(revokeTeamInviteAction, INITIAL_STATE);
  const inviteLink = `/convites/${invite.token}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // Sem bloqueio de UX; o link continua visivel para copia manual.
    }
  }

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

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-100">{invite.email}</p>
          <p className="text-xs text-zinc-400">Papel: {invite.role === "admin" ? "Administrador" : "Equipe"}</p>
          <p className="text-xs text-zinc-400">Status: {getStatusLabel(invite.status)}</p>
          <p className="text-xs text-zinc-400">Expira em: {formatDate(invite.expiresAt)}</p>

          <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2">
            <p className="text-[11px] text-zinc-400">Link do convite</p>
            <p className="mt-1 break-all text-xs text-zinc-200">{inviteLink}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className="h-9 border-zinc-600 text-zinc-100" onClick={handleCopyLink}>
            Copiar link
          </Button>

          {invite.status === "pending" ? (
            <form action={revokeAction}>
              <input type="hidden" name="invite_id" value={invite.id} />
              <RevokeButton />
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
