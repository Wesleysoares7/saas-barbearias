import Link from "next/link";

import { Button } from "@/components/ui/button";

export type AppointmentPeriod = "hoje" | "ontem" | "semana" | "todos";

const BASE_PATH = "/painel/agendamentos";

const PERIOD_OPTIONS: Array<{ value: AppointmentPeriod; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "semana", label: "Esta semana" },
  { value: "todos", label: "Todos" },
];

function periodHref(periodo: AppointmentPeriod, term: string): string {
  const search = new URLSearchParams();

  if (term) {
    search.set("q", term);
  }

  search.set("periodo", periodo);

  return `${BASE_PATH}?${search.toString()}`;
}

type AppointmentsFiltersProps = {
  term: string;
  periodo: AppointmentPeriod;
};

export function AppointmentsFilters({ term, periodo }: AppointmentsFiltersProps) {
  return (
    <div className="space-y-3">
      <form method="GET" action={BASE_PATH} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="periodo" value={periodo} />
        <input
          type="search"
          name="q"
          defaultValue={term}
          maxLength={80}
          placeholder="Buscar por cliente, telefone, servico ou funcionario"
          aria-label="Buscar agendamentos"
          className="min-h-11 w-full flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm text-zinc-100"
        />
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11 flex-1 sm:flex-none">
            Buscar
          </Button>
          {term ? (
            <Button asChild variant="outline" className="min-h-11 flex-1 sm:flex-none">
              <Link href={`${BASE_PATH}?periodo=${periodo}`}>Limpar</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            asChild
            variant={option.value === periodo ? "default" : "outline"}
            className="min-h-11 shrink-0"
          >
            <Link href={periodHref(option.value, term)} aria-current={option.value === periodo ? "true" : undefined}>
              {option.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
