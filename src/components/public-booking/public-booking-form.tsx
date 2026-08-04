"use client";

import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type ServiceRow = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
};

type EmployeeRow = {
  id: string;
  nome: string;
};

type OccupiedSlot = {
  employee_id: string;
  data_hora: string;
  data_hora_fim: string;
};

type AvailabilityResponse = {
  ok: boolean;
  message?: string;
  company?: {
    id: string;
    nome: string;
    logo: string | null;
    slug: string;
  };
  availabilityConfig?: {
    slotMinutes: number;
    startHour: number;
    endHour: number;
  };
  services: ServiceRow[];
  employees: EmployeeRow[];
  occupiedSlots: OccupiedSlot[];
};

type PublicBookingFormProps = {
  slug: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getTodayAsDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createIsoFromLocalDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function PublicBookingForm({ slug }: PublicBookingFormProps) {
  const [date, setDate] = useState(getTodayAsDateInput());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitPending, setSubmitPending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function loadAvailability(nextDate: string) {
    setLoadingAvailability(true);
    setAvailabilityError("");
    setSelectedTime("");

    try {
      const response = await fetch(`/api/public/companies/${encodeURIComponent(slug)}/availability?date=${nextDate}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as AvailabilityResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Nao foi possivel carregar a disponibilidade.");
      }

      setAvailability(data);

      if (!serviceId && data.services.length > 0) {
        setServiceId(data.services[0].id);
      }

      if (!employeeId && data.employees.length > 0) {
        setEmployeeId(data.employees[0].id);
      }
    } catch (error) {
      setAvailability(null);
      setAvailabilityError(error instanceof Error ? error.message : "Erro inesperado ao carregar disponibilidade.");
    } finally {
      setLoadingAvailability(false);
    }
  }

  const selectedService = useMemo(
    () => availability?.services.find((service) => service.id === serviceId) ?? null,
    [availability?.services, serviceId],
  );

  const availableTimes = useMemo(() => {
    if (!availability || !selectedService || !employeeId) {
      return [] as string[];
    }

    const startHour = availability.availabilityConfig?.startHour ?? 9;
    const endHour = availability.availabilityConfig?.endHour ?? 20;
    const slotMinutes = availability.availabilityConfig?.slotMinutes ?? 30;

    const occupiedRanges = availability.occupiedSlots
      .filter((slot) => slot.employee_id === employeeId)
      .map((slot) => ({
        start: new Date(slot.data_hora).getTime(),
        end: new Date(slot.data_hora_fim).getTime(),
      }));

    const output: string[] = [];

    for (let hour = startHour; hour < endHour; hour += 1) {
      for (let minute = 0; minute < 60; minute += slotMinutes) {
        const timeLabel = formatTimeLabel(hour, minute);
        const startMs = new Date(`${date}T${timeLabel}:00`).getTime();

        if (Number.isNaN(startMs)) {
          continue;
        }

        const endMs = startMs + selectedService.duracao * 60 * 1000;

        const hasConflict = occupiedRanges.some((range) => startMs < range.end && endMs > range.start);

        if (!hasConflict) {
          output.push(timeLabel);
        }
      }
    }

    return output;
  }, [availability, date, employeeId, selectedService]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTime || !serviceId || !employeeId) {
      setSubmitSuccess(false);
      setSubmitMessage("Escolha servico, profissional e horario.");
      return;
    }

    setSubmitPending(true);
    setSubmitSuccess(false);
    setSubmitMessage("");

    try {
      const response = await fetch(`/api/public/companies/${encodeURIComponent(slug)}/bookings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          serviceId,
          employeeId,
          startAt: createIsoFromLocalDateAndTime(date, selectedTime),
          notes,
          website: "",
        }),
      });

      const result = (await response.json()) as { ok: boolean; message: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Falha ao enviar agendamento.");
      }

      setSubmitSuccess(true);
      setSubmitMessage(result.message);
      setNotes("");
      setSelectedTime("");
      await loadAvailability(date);
    } catch (error) {
      setSubmitSuccess(false);
      setSubmitMessage(error instanceof Error ? error.message : "Erro inesperado ao enviar agendamento.");
    } finally {
      setSubmitPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4">
        <div className="space-y-1.5">
          <label htmlFor="date" className="block text-sm text-zinc-300">
            Data
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
          />
        </div>

        <Button type="button" onClick={() => loadAvailability(date)} disabled={loadingAvailability}>
          {loadingAvailability ? "Carregando..." : "Buscar horarios"}
        </Button>
      </div>

      {availabilityError ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-600/10 px-3 py-2 text-sm text-amber-200">{availabilityError}</p>
      ) : null}

      {availability ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Empresa</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{availability.company?.nome}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="serviceId" className="block text-sm text-zinc-300">
                Servico
              </label>
              <select
                id="serviceId"
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setSelectedTime("");
                }}
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
              >
                {availability.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nome} - {service.duracao} min - {formatCurrency(Number(service.valor ?? 0))}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="employeeId" className="block text-sm text-zinc-300">
                Profissional
              </label>
              <select
                id="employeeId"
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setSelectedTime("");
                }}
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
              >
                {availability.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-zinc-300">Horarios disponiveis</p>
            {availableTimes.length === 0 ? (
              <p className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400">
                Sem horarios disponiveis para os filtros escolhidos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      selectedTime === time
                        ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100"
                        : "border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:border-fuchsia-400/60"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="customerName" className="block text-sm text-zinc-300">
                Seu nome
              </label>
              <input
                id="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
                placeholder="Ex.: Joao Silva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customerPhone" className="block text-sm text-zinc-300">
                Telefone
              </label>
              <input
                id="customerPhone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm text-zinc-300">
              Observacoes (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
              placeholder="Ex.: prefere atendimento sem atrasos"
            />
          </div>

          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

          <Button type="submit" disabled={submitPending || !selectedTime}>
            {submitPending ? "Enviando agendamento..." : "Confirmar agendamento"}
          </Button>

          {submitMessage ? (
            <p className={`text-sm ${submitSuccess ? "text-emerald-300" : "text-amber-300"}`}>{submitMessage}</p>
          ) : null}
        </form>
      ) : (
        <p className="text-sm text-zinc-400">Escolha uma data e clique em Buscar horarios para iniciar.</p>
      )}
    </div>
  );
}
