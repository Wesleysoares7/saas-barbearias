import Link from "next/link";

type SearchParams = {
  start?: string;
  end?: string;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const defaultStart = toDateInputValue(startOfMonth);
  const defaultEnd = toDateInputValue(now);

  const start = normalizeDateInput(resolvedSearchParams.start, defaultStart);
  const end = normalizeDateInput(resolvedSearchParams.end, defaultEnd);

  const appointmentsCsvHref = `/api/reports/appointments?start=${start}&end=${end}`;
  const paymentsCsvHref = `/api/reports/payments?start=${start}&end=${end}`;
  const appointmentsPdfHref = `/api/reports/appointments/pdf?start=${start}&end=${end}`;
  const paymentsPdfHref = `/api/reports/payments/pdf?start=${start}&end=${end}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-4xl rounded-2xl border border-sky-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Relatorios e exportacao</h1>
            <p className="mt-2 text-sm text-zinc-300">Exporte dados de agendamentos e financeiro em CSV e PDF por periodo.</p>
          </div>

          <Link
            href="/painel"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-sky-400 hover:text-sky-300"
          >
            Voltar ao painel
          </Link>
        </header>

        <form className="mt-5 grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="relatorio-start" className="text-sm text-zinc-200">
              Data inicial
            </label>
            <input
              id="relatorio-start"
              name="start"
              type="date"
              defaultValue={start}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="relatorio-end" className="text-sm text-zinc-200">
              Data final
            </label>
            <input
              id="relatorio-end"
              name="end"
              type="date"
              defaultValue={end}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-sky-400"
              required
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <button
              type="submit"
              className="h-10 rounded-lg border border-zinc-600 bg-zinc-900 px-4 text-sm font-medium text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
            >
              Atualizar periodo
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <a
            href={appointmentsCsvHref}
            className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 p-4 transition hover:border-sky-400/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar agendamentos (CSV)</p>
            <p className="mt-1 text-xs text-zinc-400">Inclui cliente, status, horario, funcionario e servico.</p>
          </a>

          <a
            href={appointmentsPdfHref}
            className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 p-4 transition hover:border-sky-400/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar agendamentos (PDF)</p>
            <p className="mt-1 text-xs text-zinc-400">Resumo em PDF com periodo, total e linhas do relatorio.</p>
          </a>

          <a
            href={paymentsCsvHref}
            className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 p-4 transition hover:border-sky-400/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar financeiro (CSV)</p>
            <p className="mt-1 text-xs text-zinc-400">Inclui valor, forma de pagamento, comissao e cliente.</p>
          </a>

          <a
            href={paymentsPdfHref}
            className="rounded-xl border border-zinc-700/70 bg-zinc-950/70 p-4 transition hover:border-sky-400/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar financeiro (PDF)</p>
            <p className="mt-1 text-xs text-zinc-400">Resumo em PDF com dados de pagamentos e comissao.</p>
          </a>
        </div>
      </section>
    </main>
  );
}
