"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, MessageCircle, X } from "lucide-react";

import {
  confirmAppointmentAction,
  rejectAppointmentAction,
} from "@/app/painel/agendamentos/actions";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/datetime";

export type Notify = {
  slug: string | null;
  token: string | null;
  companyName: string;
};

export type Outcome = "confirmado" | "recusado";

export type AwaitingItem = {
  id: string;
  clienteNome: string;
  clienteTelefone: string | null;
  dataHora: string;
  servicoNome?: string;
  funcionarioNome?: string;
};

type ActionState = {
  success: boolean;
  message: string;
  notify?: Notify;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

function ActionButton({
  label,
  icon,
  confirm,
}: {
  label: string;
  icon: ReactNode;
  confirm?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={confirm ? "default" : "outline"}
      disabled={pending}
      className={`h-12 w-full sm:h-11 sm:w-auto ${
        confirm ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""
      }`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

function buildGreetingHref(item: AwaitingItem, when: string): string | null {
  const digits = (item.clienteTelefone ?? "").replace(/\D/g, "");

  if (digits.length < 10) {
    return null;
  }

  const number =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const text = `Olá, ${item.clienteNome}! Recebemos seu pedido de agendamento para ${when}.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function AwaitingAppointmentItem({
  item,
  canUpdate,
  onResolved,
}: {
  item: AwaitingItem;
  canUpdate: boolean;
  onResolved: (outcome: Outcome, notify?: Notify) => void;
}) {
  const [confirmState, confirmAction] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await confirmAppointmentAction(previous, formData);

      if (result.success) {
        onResolved("confirmado", result.notify);
      }

      return result;
    },
    INITIAL_STATE,
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await rejectAppointmentAction(previous, formData);

      if (result.success) {
        onResolved("recusado", result.notify);
      }

      return result;
    },
    INITIAL_STATE,
  );

  const when = formatDateTimeBR(item.dataHora);
  const greetingHref = buildGreetingHref(item, when);
  const errorMessage =
    (!confirmState.success && confirmState.message) ||
    (!rejectState.success && rejectState.message) ||
    "";

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.clienteNome}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.servicoNome ?? "Servico"} ·{" "}
            {item.funcionarioNome ?? "Funcionario"}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{when}</p>
          {item.clienteTelefone ? (
            <p className="text-xs text-muted-foreground">
              {item.clienteTelefone}
            </p>
          ) : null}
        </div>
        <StatusPill tone="warning">Aguardando</StatusPill>
      </div>

      {canUpdate ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <form action={confirmAction} className="w-full sm:w-auto">
            <input type="hidden" name="id" value={item.id} />
            <ActionButton
              confirm
              label="Confirmar"
              icon={<Check className="size-4" />}
            />
          </form>

          <form
            action={rejectAction}
            onSubmit={(event) => {
              if (
                !window.confirm("Recusar este pedido? O horário será liberado.")
              ) {
                event.preventDefault();
              }
            }}
            className="w-full sm:w-auto"
          >
            <input type="hidden" name="id" value={item.id} />
            <ActionButton label="Recusar" icon={<X className="size-4" />} />
          </form>

          {greetingHref ? (
            <a
              href={greetingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand/45 bg-surface-2 px-3 text-sm font-semibold text-brand hover:border-brand sm:h-11 sm:w-auto"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <p
          aria-live="polite"
          role="status"
          className="mt-3 rounded-lg border border-amber-500/50 bg-amber-600/15 px-3 py-2 text-sm text-amber-200"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
