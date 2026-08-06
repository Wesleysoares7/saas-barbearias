import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/painel/actions";
import { getPlatformAccessContext } from "@/lib/auth/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CompanyRow = {
  id: string;
  nome: string;
};

type PaymentRow = {
  company_id: string;
  valor: number | string;
  valor_comissao: number | string;
};

type AppointmentRow = {
  company_id: string;
  status: "agendado" | "concluido" | "cancelado";
};

function asNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type MasterReportsPageProps = {
  searchParams?: Promise<{
    empresa?: string;
  }>;
};

export default async function MasterReportsPage({ searchParams }: MasterReportsPageProps) {
  const { redirectTo } = await getPlatformAccessContext();

  if (redirectTo) {
    redirect(redirectTo);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const adminClient = createSupabaseAdminClient();

  const [{ data: companies }, { data: payments }, { data: appointments }, userResponse] = await Promise.all([
    adminClient.from("companies").select("id, nome").order("nome", { ascending: true }),
    adminClient.from("payments").select("company_id, valor, valor_comissao"),
    adminClient.from("appointments").select("company_id, status"),
    adminClient.auth.getUser(),
  ]);

  const companiesList = (companies ?? []) as CompanyRow[];
  const paymentsList = (payments ?? []) as PaymentRow[];
  const appointmentsList = (appointments ?? []) as AppointmentRow[];
  const companySearchTerm = resolvedSearchParams?.empresa?.trim() ?? "";
  const normalizedCompanySearchTerm = normalizeText(companySearchTerm);

  const perCompany = companiesList.map((company) => {
    const companyPayments = paymentsList.filter((item) => item.company_id === company.id);
    const companyAppointments = appointmentsList.filter((item) => item.company_id === company.id);

    const totalRevenue = companyPayments.reduce((sum, item) => sum + asNumber(item.valor), 0);
    const totalCommission = companyPayments.reduce((sum, item) => sum + asNumber(item.valor_comissao), 0);
    const totalAppointments = companyAppointments.length;
    const completedAppointments = companyAppointments.filter((item) => item.status === "concluido").length;

    return {
      ...company,
      totalRevenue,
      totalCommission,
      totalAppointments,
      completedAppointments,
    };
  });

  const visibleCompanies = normalizedCompanySearchTerm
    ? perCompany.filter((company) => normalizeText(company.nome).includes(normalizedCompanySearchTerm))
    : perCompany;

  const platformRevenue = visibleCompanies.reduce((sum, item) => sum + item.totalRevenue, 0);
  const platformCommission = visibleCompanies.reduce((sum, item) => sum + item.totalCommission, 0);
  const platformAppointments = visibleCompanies.reduce((sum, item) => sum + item.totalAppointments, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.20),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_35%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="mb-6 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur sm:p-5">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-300 uppercase">Area master</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/master/empresas"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/70"
            >
              Empresas
            </Link>
            <Link
              href="/master/relatorios"
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100"
            >
              Relatorios financeiros
            </Link>
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Rendimento financeiro da plataforma</h1>
              <p className="mt-1 text-sm text-zinc-300">Visao consolidada e por empresa para analise de faturamento e operacao.</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-rose-400 hover:text-rose-300"
              >
                Sair da conta
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Usuario: {userResponse.data.user?.email ?? "sem e-mail"}</p>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-xs text-emerald-200">Faturamento total</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">{formatCurrency(platformRevenue)}</p>
          </div>
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
            <p className="text-xs text-sky-200">Comissao total</p>
            <p className="mt-1 text-2xl font-semibold text-sky-100">{formatCurrency(platformCommission)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-xs text-amber-200">Agendamentos totais</p>
            <p className="mt-1 text-2xl font-semibold text-amber-100">{platformAppointments}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-4 shadow-2xl backdrop-blur sm:p-6">
          <form className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-700/70 bg-zinc-950/50 p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="empresa" className="mb-1 block text-sm font-medium text-zinc-200">
                Filtrar por empresa
              </label>
              <input
                id="empresa"
                name="empresa"
                type="text"
                list="master-companies"
                defaultValue={companySearchTerm}
                placeholder="Digite o nome da empresa"
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
              />
              <datalist id="master-companies">
                {companiesList.map((company) => (
                  <option key={company.id} value={company.nome} />
                ))}
              </datalist>
            </div>
            <button
              type="submit"
              className="h-10 rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              Aplicar filtro
            </button>
            <Link
              href="/master/relatorios"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-600 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/70"
            >
              Limpar
            </Link>
          </form>

          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Resumo por empresa</h2>

          {companySearchTerm ? <p className="mb-4 text-sm text-zinc-400">Filtro ativo: empresas com nome contendo &quot;{companySearchTerm}&quot;.</p> : null}

          {visibleCompanies.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">Nenhuma empresa encontrada para o filtro informado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] divide-y divide-zinc-700 text-sm">
                <thead>
                  <tr className="text-left text-zinc-300">
                    <th className="py-2 pr-3 font-medium">Empresa</th>
                    <th className="py-2 pr-3 font-medium">Faturamento</th>
                    <th className="py-2 pr-3 font-medium">Comissao</th>
                    <th className="py-2 pr-3 font-medium">Agendamentos</th>
                    <th className="py-2 pr-3 font-medium">Concluidos</th>
                    <th className="py-2 pr-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
                  {visibleCompanies.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 font-medium">{item.nome}</td>
                      <td className="py-3 pr-3">{formatCurrency(item.totalRevenue)}</td>
                      <td className="py-3 pr-3">{formatCurrency(item.totalCommission)}</td>
                      <td className="py-3 pr-3">{item.totalAppointments}</td>
                      <td className="py-3 pr-3">{item.completedAppointments}</td>
                      <td className="py-3 pr-3 text-xs text-zinc-400">{item.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
