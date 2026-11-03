"use client";

import { type FormEvent, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Pencil } from "lucide-react";

import { AppointmentDetailsDialog } from "@/components/painel/agendamentos/appointment-details-dialog";

import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/painel/ui/confirm-delete";
import { ListRow, ROW_ICON_BUTTON_CLASS } from "@/components/painel/ui/list-row";
import { StatusPill } from "@/components/painel/ui/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  deleteAppointmentAction,
  updateAppointmentAction,
} from "@/app/painel/agendamentos/actions";
import { CompleteAppointmentModal } from "@/components/painel/agendamentos/complete-appointment-modal";
import { isoToLocalInputValue, localDateTimeToIso } from "@/lib/datetime";
import {
  calculateEndDateIso,
  hasEmployeeConflict,
  type AppointmentSlot,
} from "@/lib/appointments/conflict";

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

type AppointmentItem = {
  id: string;
  customer_id: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  employee_id: string;
  service_id: string;
  data_hora: string;
  data_hora_fim: string | null;
  status: AppointmentStatus;
  observacoes: string | null;
};

type OptionItem = {
  id: string;
  nome: string;
  telefone?: string | null;
  duracao?: number;
  valor?: number;
};

type ActionState = {
  success: boolean;
  message: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function MotivoField() {
  return (
    <label className="block space-y-1 text-sm text-zinc-300">
      Motivo (opcional)
      <input
        type="text"
        name="motivo"
        maxLength={200}
        className="min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-zinc-100"
      />
    </label>
  );
}

function getStatusTone(status: AppointmentStatus | "excluido"): { label: string; tone: "success" | "danger" | "warning" } {
  if (status === "excluido") {
    return { label: "Excluido", tone: "danger" };
  }

  if (status === "concluido") {
    return { label: "Concluido", tone: "success" };
  }

  if (status === "cancelado") {
    return { label: "Cancelado", tone: "danger" };
  }

  return { label: "Agendado", tone: "warning" };
}
function toDateTimeLocal(value: string): string {
  return isoToLocalInputValue(value);
}

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300"
      disabled={pending}
    >
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function AppointmentItemForm({
  appointment,
  employees,
  services,
  customers,
  appointmentSlots,
  canUpdate,
  canDelete,
  canCompleteAndCharge,
}: {
  appointment: AppointmentItem;
  employees: OptionItem[];
  services: OptionItem[];
  customers: OptionItem[];
  appointmentSlots: AppointmentSlot[];
  canUpdate: boolean;
  canDelete: boolean;
  canCompleteAndCharge: boolean;
}) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [view, setView] = useState<"closed" | "details" | "edit">("closed");
  const [updateMessage, setUpdateMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>(appointment.status);
  const [, updateAction] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await updateAppointmentAction(previous, formData);

      setUpdateMessage(result.success ? "" : result.message);

      if (result.success) {
        const reopened =
          appointment.status === "concluido" &&
          formData.get("status") !== "concluido";
        setCompleteMessage(reopened ? result.message : null);
        setView("closed");
      }

      return result;
    },
    INITIAL_STATE,
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteAppointmentAction,
    INITIAL_STATE,
  );
  const statusTone = getStatusTone(appointment.status);
  const serviceName = services.find((service) => service.id === appointment.service_id)?.nome;
  const employeeName = employees.find((employee) => employee.id === appointment.employee_id)?.nome;

  const serviceDurationsById = useMemo(() => {
    return new Map(
      services.map((service) => [service.id, Number(service.duracao ?? 0)]),
    );
  }, [services]);

  function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canUpdate) {
      event.preventDefault();
      setClientError(
        "Seu perfil nao tem permissao para atualizar agendamentos.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);

    const employeeId = String(formData.get("employee_id") ?? "").trim();
    const serviceId = String(formData.get("service_id") ?? "").trim();
    const dataHoraInput = String(formData.get("data_hora") ?? "").trim();
    const statusInput = String(formData.get("status") ?? "").trim();

    if (
      !employeeId ||
      !serviceId ||
      !dataHoraInput ||
      statusInput !== "agendado"
    ) {
      setClientError(null);
      return;
    }

    const durationMinutes = serviceDurationsById.get(serviceId) ?? 0;
    const startIso = localDateTimeToIso(dataHoraInput);

    if (!startIso || durationMinutes <= 0) {
      setClientError(null);
      return;
    }

    const endIso = calculateEndDateIso(startIso, durationMinutes);

    const hasConflict = hasEmployeeConflict(appointmentSlots, {
      employeeId,
      newStartIso: startIso,
      newEndIso: endIso,
      ignoreAppointmentId: appointment.id,
    });

    if (hasConflict) {
      event.preventDefault();
      setClientError(
        "O horario selecionado esta indisponivel para este funcionario.",
      );
      return;
    }

    setClientError(null);
  }

  const service = services.find((item) => item.id === appointment.service_id);
  const canComplete = canCompleteAndCharge && appointment.status === "agendado";
  const showRefundWarning =
    canCompleteAndCharge &&
    appointment.status === "concluido" &&
    (selectedStatus === "cancelado" || selectedStatus === "agendado");
  const time = toDateTimeLocal(appointment.data_hora).slice(11, 16);

  return (
    <div className="space-y-2">
      <ListRow
        title={appointment.cliente_nome}
        subtitle={`${serviceName ?? "Servico"} - ${employeeName ?? "Funcionario"}`}
        columns={[
          { label: "Telefone", value: appointment.cliente_telefone?.trim() || "-" },
          { label: "Observacoes", value: appointment.observacoes?.trim() || "-" },
        ]}
        status={<StatusPill tone={statusTone.tone}>{statusTone.label}</StatusPill>}
        time={time}
        onOpen={() => setView("details")}
        openLabel={`Ver detalhes de ${appointment.cliente_nome}`}
        actions={
          <>
            {canComplete ? (
              <CompleteAppointmentModal
                appointmentId={appointment.id}
                clienteNome={appointment.cliente_nome}
                servicoNome={serviceName ?? "Servico"}
                valorSugerido={service?.valor ?? 0}
                onCompleted={(message) => {
                  setCompleteMessage(message);
                  setView("closed");
                }}
              />            ) : null}
            <div className="hidden items-center gap-1 md:flex">
              {canUpdate ? (
                <button
                  type="button"
                  className={ROW_ICON_BUTTON_CLASS}
                  aria-label={`Editar agendamento de ${appointment.cliente_nome}`}
                  title="Editar"
                  onClick={() => {
                    setUpdateMessage("");
                    setClientError(null);
                    setSelectedStatus(appointment.status);
                    setView("edit");
                  }}
                >
                  <Pencil className="size-4" />
                </button>
              ) : null}
              {canDelete ? (
                <ConfirmDelete title={appointment.cliente_nome} action={deleteAction} message={deleteState.success ? "" : deleteState.message}>
                  <input type="hidden" name="id" value={appointment.id} />
                  <MotivoField />
                </ConfirmDelete>
              ) : null}
            </div>
          </>
        }
      />

      <AppointmentDetailsDialog
        open={view === "details"}
        onOpenChange={(next) => setView(next ? "details" : "closed")}
        statusLabel={statusTone.label}
        statusTone={statusTone.tone}
        clienteNome={appointment.cliente_nome}
        clienteTelefone={appointment.cliente_telefone}
        dataHora={appointment.data_hora}
        dataHoraFim={appointment.data_hora_fim}
        servicoNome={serviceName ?? "-"}
        servicoDuracao={service?.duracao}
        servicoValor={service?.valor}
        funcionarioNome={employeeName ?? "-"}
        observacoes={appointment.observacoes}
        footer={
          <>
            {canComplete ? (
              <CompleteAppointmentModal
                appointmentId={appointment.id}
                clienteNome={appointment.cliente_nome}
                servicoNome={serviceName ?? "Servico"}
                valorSugerido={service?.valor ?? 0}
                onCompleted={(message) => {
                  setCompleteMessage(message);
                  setView("closed");
                }}
              />            ) : null}
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-border"
                onClick={() => {
                  setUpdateMessage("");
                  setClientError(null);
                  setSelectedStatus(appointment.status);
                  setView("edit");
                }}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <ConfirmDelete
                title={appointment.cliente_nome}
                triggerLabel="Excluir"
                action={deleteAction}
                message={deleteState.success ? "" : deleteState.message}
              >
                <input type="hidden" name="id" value={appointment.id} />
                <MotivoField />
              </ConfirmDelete>
            ) : null}
          </>
        }
      />

      <Dialog open={view === "edit"} onOpenChange={(next) => setView(next ? "edit" : "closed")}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
          </DialogHeader>
            <form
              action={updateAction}
              onSubmit={handleUpdateSubmit}
              className="grid gap-3 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={appointment.id} />

              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor={`agendamento-customer-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Cliente cadastrado (opcional)
                </label>
                <select
                  id={`agendamento-customer-${appointment.id}`}
                  name="customer_id"
                  defaultValue={appointment.customer_id ?? ""}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                >
                  <option value="">Nao vincular</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor={`agendamento-cliente-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Nome do cliente
                </label>
                <input
                  id={`agendamento-cliente-${appointment.id}`}
                  name="cliente_nome"
                  type="text"
                  defaultValue={appointment.cliente_nome}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`agendamento-telefone-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Telefone do cliente (manual)
                </label>
                <input
                  id={`agendamento-telefone-${appointment.id}`}
                  name="cliente_telefone"
                  type="tel"
                  defaultValue={appointment.cliente_telefone ?? ""}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`agendamento-data-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Data e horario
                </label>
                <input
                  id={`agendamento-data-${appointment.id}`}
                  name="data_hora"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(appointment.data_hora)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`agendamento-funcionario-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Funcionario
                </label>
                <select
                  id={`agendamento-funcionario-${appointment.id}`}
                  name="employee_id"
                  defaultValue={appointment.employee_id}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                  required
                >
                  <option value="">Selecione</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`agendamento-servico-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Servico
                </label>
                <select
                  id={`agendamento-servico-${appointment.id}`}
                  name="service_id"
                  defaultValue={appointment.service_id}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                  required
                >
                  <option value="">Selecione</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`agendamento-status-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Status
                </label>
                <select
                  id={`agendamento-status-${appointment.id}`}
                  name="status"
                  defaultValue={appointment.status}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as AppointmentStatus)
                  }
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                  required
                >
                  <option value="agendado">Agendado</option>
                  <option value="concluido">Concluido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor={`agendamento-observacoes-${appointment.id}`}
                  className="text-sm text-zinc-200"
                >
                  Observacoes
                </label>
                <textarea
                  id={`agendamento-observacoes-${appointment.id}`}
                  name="observacoes"
                  rows={3}
                  defaultValue={appointment.observacoes ?? ""}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                />
              </div>

              {showRefundWarning ? (
                <p className="md:col-span-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  O pagamento sera removido do caixa.
                </p>
              ) : null}

              <div className="md:col-span-2 flex items-center justify-start gap-3">
                {canUpdate ? (
                  <UpdateButton />
                ) : (
                  <p className="text-xs text-zinc-400">
                    Sem permissao para atualizar este agendamento.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-border text-zinc-100"
                  onClick={() => setView("closed")}
                >
                  Fechar
                </Button>
              </div>
            </form>
          {clientError || updateMessage ? (
            <p className="mt-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" aria-live="polite">
              {clientError ?? updateMessage}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      {completeMessage ? (
        <p className="rounded-xl border border-emerald-500/50 bg-emerald-600/15 px-4 py-2 text-sm text-emerald-200" aria-live="polite">
          {completeMessage}
        </p>
      ) : null}
    </div>
  );
}