"use client";

import { type FormEvent, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createAppointmentAction } from "@/app/painel/agendamentos/actions";
import { calculateEndDateIso, hasEmployeeConflict, type AppointmentSlot } from "@/lib/appointments/conflict";

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
  const [state, formAction] = useActionState<ActionState, FormData>(createAppointmentAction, INITIAL_STATE);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerObservations, setCustomerObservations] = useState<string>("");
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);

  const serviceDurationsById = useMemo(() => {
    return new Map(services.map((service) => [service.id, Number(service.duracao ?? 0)]));
  }, [services]);

  function handleCustomerSelection(customerId: string) {
    setSelectedCustomerId(customerId);
    
    if (customerId) {
      const selectedCustomer = customers.find(customer => customer.id === customerId);
      if (selectedCustomer) {
        setCustomerName(selectedCustomer.nome);
        setCustomerPhone(selectedCustomer.telefone || "");
        setCustomerEmail("");
        setCustomerObservations("");
        setIsNewCustomer(false);
        // Focar automaticamente no campo de data e horário
        const dataHoraInput = document.getElementById("novo-agendamento-data-hora");
        if (dataHoraInput) {
          setTimeout(() => dataHoraInput.focus(), 100);
        }
      }
    } else {
      // Limpar campos se nenhum cliente for selecionado
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerObservations("");
      setIsNewCustomer(false);
    }
  }

  function handleNewCustomerInput() {
    if (customerName.trim() && !selectedCustomerId) {
      setIsNewCustomer(true);
    } else {
      setIsNewCustomer(false);
    }
  }

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
    });

    if (hasConflict) {
      event.preventDefault();
      setClientError("Este funcionario ja possui um agendamento nesse horario.");
      return;
    }

    // Se for um novo cliente, adicionar os dados ao FormData
    if (isNewCustomer && customerName.trim()) {
      formData.append("novo_cliente_nome", customerName.trim());
      formData.append("novo_cliente_telefone", customerPhone.trim());
      formData.append("novo_cliente_email", customerEmail.trim());
      formData.append("novo_cliente_observacoes", customerObservations.trim());
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
        className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-2"
      >
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-agendamento-cliente-cadastrado" className="text-sm text-zinc-200">
            Cliente cadastrado (opcional)
          </label>
          <select
            id="novo-agendamento-cliente-cadastrado"
            name="customer_id"
            value={selectedCustomerId}
            onChange={(e) => handleCustomerSelection(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
          >
            <option value="">Selecionar depois / nao vincular</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-agendamento-cliente" className="text-sm text-zinc-200">
            Nome do cliente
          </label>
          <input
            id="novo-agendamento-cliente"
            name="cliente_nome"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              handleNewCustomerInput();
            }}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="Ex.: Carlos"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="novo-agendamento-telefone" className="text-sm text-zinc-200">
            Telefone do cliente (manual)
          </label>
          <input
            id="novo-agendamento-telefone"
            name="cliente_telefone"
            type="tel"
            value={customerPhone}
            onChange={(e) => {
              setCustomerPhone(e.target.value);
              handleNewCustomerInput();
            }}
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            placeholder="(11) 99999-9999"
          />
        </div>

        {/* Campos para novo cliente (apenas visíveis quando não está selecionando um cliente existente) */}
        {isNewCustomer && (
          <>
            <div className="space-y-1">
              <label htmlFor="novo-agendamento-cliente-email" className="text-sm text-zinc-200">
                E-mail do cliente (opcional)
              </label>
              <input
                id="novo-agendamento-cliente-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
                placeholder="cliente@email.com"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="novo-agendamento-cliente-observacoes" className="text-sm text-zinc-200">
                Observações do cliente (opcional)
              </label>
              <textarea
                id="novo-agendamento-cliente-observacoes"
                value={customerObservations}
                onChange={(e) => setCustomerObservations(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                placeholder="Preferências, alergias, anotações importantes..."
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label htmlFor="novo-agendamento-data-hora" className="text-sm text-zinc-200">
            Data e horario
          </label>
          <input
            id="novo-agendamento-data-hora"
            name="data_hora"
            type="datetime-local"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
          <label htmlFor="novo-agendamento-servico" className="text-sm text-zinc-200">
            Servico
          </label>
          <select
            id="novo-agendamento-servico"
            name="service_id"
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
          <label htmlFor="novo-agendamento-status" className="text-sm text-zinc-200">
            Status
          </label>
          <select
            id="novo-agendamento-status"
            name="status"
            defaultValue="agendado"
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
            required
          >
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="novo-agendamento-observacoes" className="text-sm text-zinc-200">
            Observacoes
          </label>
          <textarea
            id="novo-agendamento-observacoes"
            name="observacoes"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
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
