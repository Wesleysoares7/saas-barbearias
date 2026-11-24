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

type ActionState = {
  success: boolean;
  message: string;
};

type AwaitingAppointment = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  data_hora: string;
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

function buildWhatsappHref(
  phone: string | null,
  name: string,
  when: string,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");

  if (digits.length < 10) {
    return null;
  }

  const number =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const text = `Olá, ${name}! Recebemos seu pedido de agendamento para ${when}.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function AwaitingAppointmentItem({
  appointment,
  servicoNome,
  funcionarioNome,
  canUpdate,
}: {
  appointment: AwaitingAppointment;
  servicoNome?: string;
  funcionarioNome?: string;
  canUpdate: boolean;
}) {
  const [confirmState, confirmAction] = useActionState<ActionState, FormData>(
    confirmAppointmentAction,
    INITIAL_STATE,
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectAppointmentAction,
    INITIAL_STATE,
  );

  const when = formatDateTimeBR(appointment.data_hora);
  const whatsappHref = buildWhatsappHref(
    appointment.cliente_telefone,
    appointment.cliente_nome,
    when,
  );
  const errorMessage =
    (!confirmState.success && confirmState.message) ||
    (!rejectState.success && rejectState.message) ||
    "";

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {appointment.cliente_nome}
          </p>
          <p className="text-xs text-muted-foreground">
            {servicoNome ?? "Servico"} · {funcionarioNome ?? "Funcionario"}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{when}</p>
          {appointment.cliente_telefone ? (
            <p className="text-xs text-muted-foreground">
              {appointment.cliente_telefone}
            </p>
          ) : null}
        </div>
        <StatusPill tone="warning">Aguardando</StatusPill>
      </div>

      {canUpdate ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <form action={confirmAction} className="w-full sm:w-auto">
            <input type="hidden" name="id" value={appointment.id} />
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
            <input type="hidden" name="id" value={appointment.id} />
            <ActionButton label="Recusar" icon={<X className="size-4" />} />
          </form>

          {whatsappHref ? (
            <a
              href={whatsappHref}
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
