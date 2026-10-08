"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createPaymentAction } from "@/app/painel/financeiro/actions";

type ActionState = {
  success: boolean;
  message: string;
};

type AppointmentOption = {
  id: string;
  clienteNome: string;
  dataHora: string;
  valorSugerido: number;
  percentualComissaoSugerido: number;
};

const INITIAL_STATE: ActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Registrar pagamento"}
    </Button>
  );
}

function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function CreatePaymentForm({ appointments }: { appointments: AppointmentOption[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createPaymentAction, INITIAL_STATE);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");

  const appointmentById = useMemo(() => {
    return new Map(appointments.map((item) => [item.id, item]));
  }, [appointments]);

  const selectedAppointment = selectedAppointmentId ? appointmentById.get(selectedAppointmentId) : null;

  return (
    <>
      {state.message ? (
        <div className="sticky top-3 z-30 flex justify-center" aria-live="polite">
          <div
            className={`w-full max-w-2xl rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              state.success
                ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                : "border-amber-500/50 bg-amber-600/15 text-amber-200"
            }`}
            style={state.success ? { animation: "payment-toast-fade 3.5s ease forwards" } : undefined}
          >
            {state.message}
          </div>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-pagamento-agendamento" className="text-sm text-zinc-200">
            Agendamento concluido
          </label>
          <select
            id="novo-pagamento-agendamento"
            name="appointment_id"
            value={selectedAppointmentId}
            onChange={(event) => setSelectedAppointmentId(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          >
            <option value="">Selecione</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.clienteNome} - {formatDateTimeLabel(appointment.dataHora)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-pagamento-valor" className="text-sm text-zinc-200">
            Valor (R$)
          </label>
          <input
            id="novo-pagamento-valor"
            name="valor"
            type="number"
            min={0}
            step="0.01"
            defaultValue={selectedAppointment ? selectedAppointment.valorSugerido : undefined}
            key={`valor-${selectedAppointmentId}`}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-pagamento-comissao" className="text-sm text-zinc-200">
            Comissao (%)
          </label>
          <input
            id="novo-pagamento-comissao"
            name="percentual_comissao"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={selectedAppointment ? selectedAppointment.percentualComissaoSugerido : undefined}
            key={`comissao-${selectedAppointmentId}`}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-pagamento-forma" className="text-sm text-zinc-200">
            Forma de pagamento
          </label>
          <input
            id="novo-pagamento-forma"
            name="forma_pagamento"
            type="text"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Ex.: Pix, Cartao, Dinheiro"
            required
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-start gap-3">
          <SubmitButton />
        </div>
      </form>

      <style jsx>{`
        @keyframes payment-toast-fade {
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
