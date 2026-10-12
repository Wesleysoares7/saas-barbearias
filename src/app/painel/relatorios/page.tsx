import { FileBarChart2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { PageHeader } from "@/components/painel/ui/page-header";
import { monthStartInputValue, todayInputValue } from "@/lib/datetime";
type SearchParams = {
  start?: string;
  end?: string;
};

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
  const { companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!isAdmin(role)) {
    redirect("/painel");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const defaultStart = monthStartInputValue();
  const defaultEnd = todayInputValue();

  const start = normalizeDateInput(resolvedSearchParams.start, defaultStart);
  const end = normalizeDateInput(resolvedSearchParams.end, defaultEnd);

  const appointmentsCsvHref = `/api/reports/appointments?start=${start}&end=${end}`;
  const paymentsCsvHref = `/api/reports/payments?start=${start}&end=${end}`;
  const appointmentsPdfHref = `/api/reports/appointments/pdf?start=${start}&end=${end}`;
  const paymentsPdfHref = `/api/reports/payments/pdf?start=${start}&end=${end}`;

  return (
    <div className="space-y-5">
        <PageHeader icon={FileBarChart2} title="Relatorios e exportacao" description="Exporte dados de agendamentos e financeiro em CSV e PDF por periodo." />

        <form className="mt-5 grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="relatorio-start" className="text-sm text-zinc-200">
              Data inicial
            </label>
            <input
              id="relatorio-start"
              name="start"
              type="date"
              defaultValue={start}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
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
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
              required
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-start gap-3">
            <button
              type="submit"
              className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-zinc-100 transition hover:border-brand hover:text-brand"
            >
              Atualizar periodo
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <a
            href={appointmentsCsvHref}
            className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-brand/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar agendamentos (CSV)</p>
            <p className="mt-1 text-xs text-zinc-400">Inclui cliente, status, horario, funcionario e servico.</p>
          </a>

          <a
            href={appointmentsPdfHref}
            className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-brand/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar agendamentos (PDF)</p>
            <p className="mt-1 text-xs text-zinc-400">Resumo em PDF com periodo, total e linhas do relatorio.</p>
          </a>

          <a
            href={paymentsCsvHref}
            className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-brand/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar financeiro (CSV)</p>
            <p className="mt-1 text-xs text-zinc-400">Inclui valor, forma de pagamento, comissao e cliente.</p>
          </a>

          <a
            href={paymentsPdfHref}
            className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-brand/60"
          >
            <p className="text-sm font-semibold text-zinc-100">Exportar financeiro (PDF)</p>
            <p className="mt-1 text-xs text-zinc-400">Resumo em PDF com dados de pagamentos e comissao.</p>
          </a>
        </div>
    </div>
  );
}
