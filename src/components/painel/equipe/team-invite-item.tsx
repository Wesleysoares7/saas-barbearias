"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { deleteTeamInviteAction, revokeTeamInviteAction } from "@/app/painel/equipe/actions";
import { Button } from "@/components/ui/button";
import { type UserRole } from "@/lib/auth/access";
import { formatDateTimeBR } from "@/lib/datetime";

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
    <Button type="submit" variant="outline" className="h-9 border-border text-zinc-100" disabled={pending}>
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
  const formatted = formatDateTimeBR(value);

  return formatted === "-" ? value : formatted;
}

export function TeamInviteItem({ invite }: { invite: TeamInviteItem }) {
  const [state, revokeAction] = useActionState<ActionState, FormData>(revokeTeamInviteAction, INITIAL_STATE);
  const inviteLink = `/convites/${invite.token}`;
  const [deleteState, setDeleteState] = useState<ActionState>(INITIAL_STATE);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir o convite de ${invite.email}? Esta acao nao pode ser desfeita.`)) {
      return;
    }

    startDelete(async () => {
      setDeleteState(await deleteTeamInviteAction(invite.id));
    });
  }

  async function handleCopyLink() {
    try {
      const inviteUrl = `${window.location.origin}${inviteLink}`;
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Sem bloqueio de UX; o link continua visivel para copia manual.
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface-2 p-4">
      {(deleteState.message || state.message) ? (
        <div className="mb-3" aria-live="polite">
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              (deleteState.message ? deleteState.success : state.success)
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
          >
            {deleteState.message || state.message}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-100">{invite.email}</p>
          <p className="text-xs text-zinc-400">Papel: {invite.role === "admin" ? "Administrador" : "Equipe"}</p>
          <p className="text-xs text-zinc-400">Status: {getStatusLabel(invite.status)}</p>
          <p className="text-xs text-zinc-400">Expira em: {formatDate(invite.expiresAt)}</p>

          <div className="rounded-lg border border-border bg-surface px-3 py-2">
            <p className="text-[11px] text-zinc-400">Link do convite</p>
            <p className="mt-1 break-all text-xs text-zinc-200">{inviteLink}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className="h-9 border-border text-zinc-100" onClick={handleCopyLink}>
            Copiar link
          </Button>

          {invite.status === "pending" ? (
            <>
              <form action={revokeAction}>
                <input type="hidden" name="invite_id" value={invite.id} />
                <RevokeButton />
              </form>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-rose-500/50 text-rose-300"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
