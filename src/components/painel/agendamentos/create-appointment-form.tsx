"use client";

import { type FormEvent, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { CustomerCombobox } from "@/components/painel/agendamentos/customer-combobox";
import { Button } from "@/components/ui/button";
import { createAppointmentAction } from "@/app/painel/agendamentos/actions";
import { calculateEndDateIso, hasEmployeeConflict, type AppointmentSlot } from "@/lib/appointments/conflict";
import { localDateTimeToIso } from "@/lib/datetime";
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from "@/lib/payment-methods";

type ActionState = {
  success: boolean;
  message: string;
};

type OptionItem = {
  id: string;
  nome: string;
  telefone?: string | null;
  duracao?: number;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar agendamento"}
    </Button>
  );
}

export function CreateAppointmentForm({
  employees,
  services,
  customers,
  appointmentSlots,
}: {
  employees: OptionItem[];
  services: OptionItem[];
  customers: OptionItem[];
  appointmentSlots: AppointmentSlot[];
}) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [status, setStatus] = useState("agendado");
  const [formaPagamento, setFormaPagamento] = useState<string>(DEFAULT_PAYMENT_METHOD);
  const [state, formAction] = useActionState<ActionState, FormData>(createAppointmentAction, INITIAL_STATE);
  const serviceDurationsById = useMemo(() => {
    return new Map(services.map((service) => [service.id, Number(service.duracao ?? 0)]));
  }, [services]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const employeeId = String(formData.get("employee_id") ?? "").trim();
    const serviceId = String(formData.get("service_id") ?? "").trim();
    const dataHoraInput = String(formData.get("data_hora") ?? "").trim();
    const statusInput = String(formData.get("status") ?? "").trim();

    if (!employeeId || !serviceId || !dataHoraInput || statusInput !== "agendado") {
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
    });

    if (hasConflict) {
      event.preventDefault();
      setClientError("Este funcionario ja possui um agendamento nesse horario.");
      return;
    }

    setClientError(null);
  }

  return (
    <>
      {clientError ? (
        <div className="sticky top-3 z-30 flex justify-center" aria-live="polite">
          <div className="w-full max-w-2xl rounded-lg border border-amber-500/50 bg-amber-600/15 px-4 py-3 text-sm font-medium text-amber-200 shadow-lg">
            {clientError}
          </div>
        </div>
      ) : null}

      {state.message ? (
        <div className="sticky top-3 z-30 flex justify-center" aria-live="polite">
          <div
            className={`w-full max-w-2xl rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={state.success ? { animation: "appointment-toast-fade 3.5s ease forwards" } : undefined}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-2"
      >
        <CustomerCombobox customers={customers} />

        <div className="space-y-1">
          <label htmlFor="novo-agendamento-data-hora" className="text-sm text-zinc-200">
            Data e horario
          </label>
          <input
            id="novo-agendamento-data-hora"
            name="data_hora"
            type="datetime-local"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-agendamento-funcionario" className="text-sm text-zinc-200">
            Funcionario
          </label>
          <select
            id="novo-agendamento-funcionario"
            name="employee_id"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
          <label htmlFor="novo-agendamento-servico" className="text-sm text-zinc-200">
            Servico
          </label>
          <select
            id="novo-agendamento-servico"
            name="service_id"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
          <label htmlFor="novo-agendamento-status" className="text-sm text-zinc-200">
            Status
          </label>
          <select
            id="novo-agendamento-status"
            name="status"
            defaultValue="agendado"
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          >
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {status === "concluido" ? (
          <div className="space-y-1">
            <p className="text-sm text-zinc-200">Forma de pagamento</p>
            <input type="hidden" name="forma_pagamento" value={formaPagamento} />
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormaPagamento(method.value)}
                  className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${
                    formaPagamento === method.value
                      ? "border-amber-400 bg-amber-400/15 text-amber-200"
                      : "border-border bg-surface text-zinc-300 hover:border-border"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-agendamento-observacoes" className="text-sm text-zinc-200">
            Observacoes
          </label>
          <textarea
            id="novo-agendamento-observacoes"
            name="observacoes"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Detalhes adicionais do atendimento"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-start gap-3">
          <SubmitButton />
        </div>
      </form>

      <style>{`
        @keyframes appointment-toast-fade {
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
    </>
  );
}
