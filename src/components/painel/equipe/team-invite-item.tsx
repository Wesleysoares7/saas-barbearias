"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
  atendeClientes: boolean;
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
    <Button type="submit" variant="outline" className="min-h-11 border-border text-zinc-100 sm:min-h-9" disabled={pending}>
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

export function TeamInviteItem({
  invite,
  baseUrl,
  companyName,
}: {
  invite: TeamInviteItem;
  baseUrl: string;
  companyName: string;
}) {
  const [state, revokeAction] = useActionState<ActionState, FormData>(revokeTeamInviteAction, INITIAL_STATE);
  const inviteLink = `${baseUrl}/convites/${invite.token}`;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [now] = useState(() => Date.now());
  const isExpired = invite.status === "pending" && new Date(invite.expiresAt).getTime() < now;
  const canShare = invite.status === "pending" && !isExpired;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Ola! Voce foi convidado para a equipe da ${companyName}. Para entrar, acesse: ${inviteLink}`,
  )}`;

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), copyState === "copied" ? 2000 : 5000);
    return () => window.clearTimeout(timer);
  }, [copyState]);
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
      await navigator.clipboard.writeText(inviteLink);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
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
          <p className="text-xs text-zinc-400">Perfil: {invite.role === "admin" ? "Administrador" : invite.atendeClientes ? "Funcionario" : "Recepcao"}</p>
          <p className="text-xs text-zinc-400">Status: {isExpired ? "Expirado" : getStatusLabel(invite.status)}</p>
          <p className="text-xs text-zinc-400">Atende clientes: {invite.atendeClientes ? "Sim" : "Nao"}</p>
          <p className="text-xs text-zinc-400">Expira em: {formatDate(invite.expiresAt)}</p>

          <div className="rounded-lg border border-border bg-surface px-3 py-2">
            <p className="text-[11px] text-zinc-400">Link do convite</p>
            <p className="mt-1 break-all text-xs text-zinc-200">{inviteLink}</p>
            {copyState === "failed" ? (
              <p className="mt-1 text-xs text-amber-200">Nao foi possivel copiar. Selecione o link e copie manualmente.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11 border-border text-zinc-100 sm:min-h-9" onClick={handleCopyLink}>
            {copyState === "copied" ? "Link copiado!" : "Copiar link"}
          </Button>

          {canShare ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-zinc-100 hover:bg-surface sm:min-h-9"
            >
              Enviar por WhatsApp
            </a>
          ) : null}

          {invite.status === "pending" ? (
            <>
              <form action={revokeAction}>
                <input type="hidden" name="invite_id" value={invite.id} />
                <RevokeButton />
              </form>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-rose-500/50 text-rose-300 sm:min-h-9"
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
