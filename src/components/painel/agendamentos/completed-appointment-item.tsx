"use client";

import { useActionState } from "react";

import { deleteAppointmentAction } from "@/app/painel/agendamentos/actions";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { ListRow } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { isoToLocalInputValue } from "@/lib/datetime";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface CompletedAppointmentItemProps {
  appointment: {
    id: string;
    cliente_nome: string;
    cliente_telefone: string | null;
    data_hora: string;
    data_hora_fim: string | null;
    observacoes: string | null;
    valor_pago?: number | null;
  };
  servicoNome?: string;
  funcionarioNome?: string;
  canDelete?: boolean;
}

type ActionState = { success: boolean; message: string };

const INITIAL_STATE: ActionState = { success: false, message: "" };

export function CompletedAppointmentItem({
  appointment,
  servicoNome,
  funcionarioNome,
  canDelete = false,
}: CompletedAppointmentItemProps) {
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteAppointmentAction, INITIAL_STATE);
  const hasValue = typeof appointment.valor_pago === "number";
  const subtitle = `${servicoNome ?? "Servico"} - ${funcionarioNome ?? "Funcionario"}${
    hasValue ? ` - ${currencyFormatter.format(appointment.valor_pago ?? 0)}` : ""
  }`;

  return (
    <ListRow
      time={isoToLocalInputValue(appointment.data_hora).slice(11, 16)}
      title={appointment.cliente_nome}
      subtitle={subtitle}
      columns={[
        { label: "Telefone", value: appointment.cliente_telefone?.trim() || "-" },
        { label: "Observacoes", value: appointment.observacoes?.trim() || "-" },
      ]}
      status={<StatusPill tone="success">Concluido</StatusPill>}
      actions={
        canDelete ? (
          <ConfirmDelete
            title={appointment.cliente_nome}
            description="O pagamento deste atendimento sera estornado do caixa."
            action={deleteAction}
            message={deleteState.success ? "" : deleteState.message}
          >
            <input type="hidden" name="id" value={appointment.id} />
            <label className="block space-y-1 text-sm text-zinc-300">
              Motivo (opcional)
              <input
                type="text"
                name="motivo"
                maxLength={200}
                className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-zinc-100"
              />
            </label>
          </ConfirmDelete>
        ) : null
      }
    />
  );
}