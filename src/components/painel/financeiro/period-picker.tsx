"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PeriodPickerProps = {
  start: string;
  end: string;
  aba: string;
};

function toInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function shortDate(value: string): string {
  const [, month, day] = value.split("-");

  return `${day}/${month}`;
}

const CHIP_CLASS =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition";
const CHIP_IDLE = `${CHIP_CLASS} border-border bg-surface text-foreground hover:border-brand`;
const CHIP_ACTIVE = `${CHIP_CLASS} border-brand bg-brand/15 text-brand`;
const DATE_INPUT_CLASS =
  "min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-base text-foreground outline-none focus:border-brand";

export function PeriodPicker({ start, end, aba }: PeriodPickerProps) {
  const router = useRouter();
  const [custom, setCustom] = useState(false);
  const [customStart, setCustomStart] = useState(start);
  const [customEnd, setCustomEnd] = useState(end);

  function go(nextStart: string, nextEnd: string) {
    const params = new URLSearchParams({ aba, start: nextStart, end: nextEnd });

    router.push(`/painel/financeiro?${params.toString()}`);
  }

  function pick(kind: "hoje" | "7dias" | "mes" | "passado") {
    const now = new Date();

    if (kind === "hoje") {
      go(toInputValue(now), toInputValue(now));
    } else if (kind === "7dias") {
      go(toInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), toInputValue(now));
    } else if (kind === "mes") {
      go(toInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), toInputValue(now));
    } else {
      go(
        toInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        toInputValue(new Date(now.getFullYear(), now.getMonth(), 0)),
      );
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-xs text-muted-foreground">
        Periodo: <span className="font-medium text-foreground">{shortDate(start)} - {shortDate(end)}</span>
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={CHIP_IDLE} onClick={() => pick("hoje")}>
          Hoje
        </button>
        <button type="button" className={CHIP_IDLE} onClick={() => pick("7dias")}>
          7 dias
        </button>
        <button type="button" className={CHIP_IDLE} onClick={() => pick("mes")}>
          Este mes
        </button>
        <button type="button" className={CHIP_IDLE} onClick={() => pick("passado")}>
          Mes passado
        </button>
        <button type="button" className={custom ? CHIP_ACTIVE : CHIP_IDLE} onClick={() => setCustom((value) => !value)}>
          Personalizado
        </button>
      </div>

      {custom ? (
        <form
          className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();

            if (customStart && customEnd) {
              go(customStart, customEnd);
            }
          }}
        >
          <input
            type="date"
            aria-label="Data inicial"
            value={customStart}
            onChange={(event) => setCustomStart(event.target.value)}
            className={DATE_INPUT_CLASS}
            required
          />
          <input
            type="date"
            aria-label="Data final"
            value={customEnd}
            onChange={(event) => setCustomEnd(event.target.value)}
            className={DATE_INPUT_CLASS}
            required
          />
          <button
            type="submit"
            className="col-span-2 min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground sm:col-span-1"
          >
            Aplicar
          </button>
        </form>
      ) : null}
    </div>
  );
}
