"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";

import { saveWorkHoursAction } from "@/app/painel/horarios/actions";
import { Button } from "@/components/ui/button";

type ActionState = {
  success: boolean;
  message: string;
};

type Slot = { start: string; end: string };
type Days = Record<number, Slot[]>;

export type WorkHourRow = {
  weekday: number;
  start_minute: number;
  end_minute: number;
};

const INITIAL_STATE: ActionState = { success: false, message: "" };

const WEEK = [
  { day: 1, label: "Segunda" },
  { day: 2, label: "Terça" },
  { day: 3, label: "Quarta" },
  { day: 4, label: "Quinta" },
  { day: 5, label: "Sexta" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
];

const TIME_INPUT_CLASS =
  "h-12 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base sm:h-11 sm:text-sm";

function minutesToTime(value: number): string {
  const safe = Math.min(value, 1439);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return -1;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function buildDays(rows: WorkHourRow[]): Days {
  const days: Days = {};

  for (const row of rows) {
    const list = days[row.weekday] ?? [];

    list.push({
      start: minutesToTime(row.start_minute),
      end: minutesToTime(row.end_minute),
    });
    days[row.weekday] = list;
  }

  return days;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:h-11 sm:w-auto"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Salvando...
        </>
      ) : (
        "Salvar horarios"
      )}
    </Button>
  );
}

export function WorkHoursForm({
  employeeId,
  employeeName,
  rows,
}: {
  employeeId: string;
  employeeName: string;
  rows: WorkHourRow[];
}) {
  const [days, setDays] = useState<Days>(() => buildDays(rows));
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveWorkHoursAction,
    INITIAL_STATE,
  );

  const payload = JSON.stringify(
    Object.entries(days).flatMap(([weekday, slots]) =>
      slots.map((slot) => ({
        weekday: Number(weekday),
        start: timeToMinutes(slot.start),
        end: timeToMinutes(slot.end),
      })),
    ),
  );

  const openDays = Object.values(days).filter(
    (slots) => slots.length > 0,
  ).length;

  function updateSlot(
    day: number,
    index: number,
    field: keyof Slot,
    value: string,
  ) {
    setDays((current) => ({
      ...current,
      [day]: (current[day] ?? []).map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  }

  function addSlot(day: number) {
    setDays((current) => {
      const list = current[day] ?? [];
      const next =
        list.length === 0
          ? { start: "09:00", end: "12:00" }
          : { start: "14:00", end: "18:00" };

      return { ...current, [day]: [...list, next] };
    });
  }

  function removeSlot(day: number, index: number) {
    setDays((current) => ({
      ...current,
      [day]: (current[day] ?? []).filter((_, slotIndex) => slotIndex !== index),
    }));
  }

  function copyMondayToWeekdays() {
    setDays((current) => {
      const monday = current[1] ?? [];
      const copy: Days = { ...current };

      for (const day of [2, 3, 4, 5]) {
        copy[day] = monday.map((slot) => ({ ...slot }));
      }

      return copy;
    });
  }

  return (
    <form action={formAction}>
      <details className="group rounded-xl border border-border bg-surface-2">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {employeeName}
            </span>
            <span className="block text-xs text-muted-foreground">
              {openDays === 0
                ? "Sem horario cadastrado"
                : `${openDays} dia(s) com atendimento`}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-border p-3">
          <input type="hidden" name="employee_id" value={employeeId} />
          <input type="hidden" name="intervals" value={payload} />

          {WEEK.map(({ day, label }) => {
            const slots = days[day] ?? [];

            return (
              <div
                key={day}
                className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-start"
              >
                <p className="w-24 shrink-0 text-sm font-medium text-foreground sm:pt-3">
                  {label}
                </p>

                <div className="min-w-0 flex-1 space-y-2">
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Fechado</p>
                  ) : (
                    slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          aria-label={`${label}: inicio`}
                          value={slot.start}
                          onChange={(event) =>
                            updateSlot(day, index, "start", event.target.value)
                          }
                          className={TIME_INPUT_CLASS}
                        />
                        <span className="text-sm text-muted-foreground">
                          as
                        </span>
                        <input
                          type="time"
                          aria-label={`${label}: fim`}
                          value={slot.end}
                          onChange={(event) =>
                            updateSlot(day, index, "end", event.target.value)
                          }
                          className={TIME_INPUT_CLASS}
                        />
                        <button
                          type="button"
                          aria-label="Remover intervalo"
                          onClick={() => removeSlot(day, index)}
                          className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground sm:size-11"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand"
                  >
                    <Plus className="size-4" />
                    {slots.length === 0
                      ? "Abrir este dia"
                      : "Adicionar intervalo"}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center">
            <SubmitButton />
            <Button
              type="button"
              variant="outline"
              onClick={copyMondayToWeekdays}
              className="h-12 w-full sm:h-11 sm:w-auto"
            >
              Copiar segunda para terça a sexta
            </Button>
          </div>

          {state.message ? (
            <p
              aria-live="polite"
              role="status"
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                state.success
                  ? "border-emerald-500/50 bg-emerald-600/15 text-emerald-200"
                  : "border-amber-500/50 bg-amber-600/15 text-amber-200"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </details>
    </form>
  );
}
