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
}

export function CompletedAppointmentItem({ appointment, servicoNome, funcionarioNome }: CompletedAppointmentItemProps) {
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
      actions={null}
    />
  );
}