"use client";

import { type FormEvent, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  deleteAppointmentAction,
  updateAppointmentAction,
} from "@/app/painel/agendamentos/actions";
import { CompleteAppointmentModal } from "@/components/painel/agendamentos/complete-appointment-modal";
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
  duracao?: number;
  valor?: number;
};

type ActionState = {
  success: boolean;
  message: string;
};

type StatusMeta = {
  label: string;
  badgeClassName: string;
  cardClassName: string;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function getStatusMeta(status: AppointmentStatus): StatusMeta {
  if (status === "concluido") {
    return {
      label: "Concluido",
      badgeClassName:
        "border-emerald-500/50 bg-emerald-600/15 text-emerald-200",
      cardClassName: "border-emerald-500/35",
    };
  }

  if (status === "cancelado") {
    return {
      label: "Cancelado",
      badgeClassName: "border-rose-500/50 bg-rose-600/15 text-rose-200",
      cardClassName: "border-rose-500/35",
    };
  }

  return {
    label: "Agendado",
    badgeClassName: "border-amber-500/50 bg-amber-600/15 text-amber-200",
    cardClassName: "border-amber-500/35",
  };
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="h-9 border-zinc-600 text-zinc-100"
      disabled={pending}
    >
      {pending ? "Excluindo..." : "Excluir"}
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
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useActionState<ActionState, FormData>(
    updateAppointmentAction,
    INITIAL_STATE,
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteAppointmentAction,
    INITIAL_STATE,
  );
  const statusMeta = getStatusMeta(appointment.status);
  const shouldShowEditForm =
    isEditing || (!updateState.success && Boolean(updateState.message));

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
    const startDate = new Date(dataHoraInput);

    if (Number.isNaN(startDate.getTime()) || durationMinutes <= 0) {
      setClientError(null);
      return;
    }

    const startIso = startDate.toISOString();
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

  return (
    <article
      className={`rounded-xl border bg-zinc-950/60 p-4 ${statusMeta.cardClassName}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
          Status atual
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusMeta.badgeClassName}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {completeMessage ? (
        <div
          className="sticky top-3 z-20 mb-3 flex justify-center"
          aria-live="polite"
        >
          <div
            className="w-full rounded-lg border border-emerald-500/50 bg-emerald-600/15 px-4 py-3 text-sm font-medium text-emerald-200"
            style={{
              animation: "appointment-item-toast-fade 3.5s ease forwards",
            }}
          >
            {completeMessage}
          </div>
        </div>
      ) : null}

      {clientError ? (
        <div
          className="sticky top-3 z-20 mb-3 flex justify-center"
          aria-live="polite"
        >
          <div className="w-full rounded-lg border border-amber-500/50 bg-amber-600/15 px-4 py-3 text-sm font-medium text-amber-200">
            {clientError}
          </div>
        </div>
      ) : null}

      {updateState.message ? (
        <div
          className="sticky top-3 z-20 mb-3 flex justify-center"
          aria-live="polite"
        >
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              updateState.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={
              updateState.success
                ? {
                    animation: "appointment-item-toast-fade 3.5s ease forwards",
                  }
                : undefined
            }
          >
            {updateState.message}
          </div>
        </div>
      ) : null}

      {deleteState.message ? (
        <div
          className="sticky top-3 z-20 mb-3 flex justify-center"
          aria-live="polite"
        >
          <div
            className={`w-full rounded-lg border px-4 py-3 text-sm font-medium ${
              deleteState.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={
              deleteState.success
                ? {
                    animation: "appointment-item-toast-fade 3.5s ease forwards",
                  }
                : undefined
            }
          >
            {deleteState.message}
          </div>
        </div>
      ) : null}

      {shouldShowEditForm ? (
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </div>

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
              className="h-9 border-zinc-600 text-zinc-100"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Cliente</p>
            <p className="text-sm text-zinc-100">{appointment.cliente_nome}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Telefone</p>
            <p className="text-sm text-zinc-100">
              {appointment.cliente_telefone?.trim() || "Nao informado"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Horario</p>
            <p className="text-sm text-zinc-100">
              {toDateTimeLocal(appointment.data_hora).replace("T", " ")}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Funcionario</p>
            <p className="text-sm text-zinc-100">
              {employees.find(
                (employee) => employee.id === appointment.employee_id,
              )?.nome ?? "Nao informado"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-zinc-400">Servico</p>
            <p className="text-sm text-zinc-100">
              {services.find((service) => service.id === appointment.service_id)
                ?.nome ?? "Nao informado"}
            </p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-zinc-400">Observacoes</p>
            <p className="text-sm text-zinc-100">
              {appointment.observacoes?.trim() || "Sem observacoes"}
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            {canUpdate ? (
              <Button
                type="button"
                className="h-9 bg-amber-400 text-zinc-950 hover:bg-amber-300"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            ) : null}

            {canCompleteAndCharge && appointment.status === "agendado" ? (
              <CompleteAppointmentModal
                appointmentId={appointment.id}
                clienteNome={appointment.cliente_nome}
                servicoNome={
                  services.find(
                    (service) => service.id === appointment.service_id,
                  )?.nome ?? "Servico"
                }
                valorSugerido={
                  services.find(
                    (service) => service.id === appointment.service_id,
                  )?.valor ?? 0
                }
                onCompleted={(message) => setCompleteMessage(message)}
              />
            ) : null}
          </div>
        </div>
      )}

      {canDelete ? (
        <form
          action={deleteAction}
          className="mt-3 flex items-center justify-end gap-3"
        >
          <input type="hidden" name="id" value={appointment.id} />
          <DeleteButton />
        </form>
      ) : (
        <p className="mt-3 text-right text-xs text-zinc-500">
          Seu perfil nao pode excluir agendamentos.
        </p>
      )}

      <style jsx>{`
        @keyframes appointment-item-toast-fade {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
      `}</style>
    </article>
  );
}
