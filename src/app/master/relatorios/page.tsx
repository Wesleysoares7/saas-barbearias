import Link from "next/link";
import { redirect } from "next/navigation";

import { BarChart3 } from "lucide-react";

import { ListRow } from "@/components/painel/ui/list-row";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { getPlatformAccessContext } from "@/lib/auth/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { endOfDayIso, startOfDayIso } from "@/lib/datetime";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base text-foreground outline-none focus:border-brand";

type CompanyRow = {
  id: string;
  nome: string;
};

type PaymentRow = {
  company_id: string;
  valor: number | string;
  valor_comissao: number | string;
  created_at: string;
};

type AppointmentRow = {
  company_id: string;
  status: "agendado" | "concluido" | "cancelado";
  data_hora: string;
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
    dataInicio?: string;
    dataFim?: string;
  }>;
};

function parseStartDate(dateValue: string | undefined) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(startOfDayIso(dateValue));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseEndDate(dateValue: string | undefined) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(endOfDayIso(dateValue));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInsideDateRange(valueIso: string, startDate: Date | null, endDate: Date | null) {
  const valueDate = new Date(valueIso);

  if (Number.isNaN(valueDate.getTime())) {
    return false;
  }

  if (startDate && valueDate < startDate) {
    return false;
  }

  if (endDate && valueDate > endDate) {
    return false;
  }

  return true;
}

export default async function MasterReportsPage({ searchParams }: MasterReportsPageProps) {
  const { redirectTo } = await getPlatformAccessContext();

  if (redirectTo) {
    redirect(redirectTo);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const adminClient = createSupabaseAdminClient();

  const [{ data: companies }, { data: payments }, { data: appointments }] = await Promise.all([
    adminClient.from("companies").select("id, nome").order("nome", { ascending: true }),
    adminClient.from("payments").select("company_id, valor, valor_comissao, created_at"),
    adminClient.from("appointments").select("company_id, status, data_hora"),
  ]);

  const companiesList = (companies ?? []) as CompanyRow[];
  const paymentsList = (payments ?? []) as PaymentRow[];
  const appointmentsList = (appointments ?? []) as AppointmentRow[];
  const companySearchTerm = resolvedSearchParams?.empresa?.trim() ?? "";
  const normalizedCompanySearchTerm = normalizeText(companySearchTerm);
  const startDateInput = resolvedSearchParams?.dataInicio?.trim() ?? "";
  const endDateInput = resolvedSearchParams?.dataFim?.trim() ?? "";
  const startDate = parseStartDate(startDateInput || undefined);
  const endDate = parseEndDate(endDateInput || undefined);

  const filteredPayments = paymentsList.filter((item) => isInsideDateRange(item.created_at, startDate, endDate));
  const filteredAppointments = appointmentsList.filter((item) => isInsideDateRange(item.data_hora, startDate, endDate));

  const perCompany = companiesList.map((company) => {
    const companyPayments = filteredPayments.filter((item) => item.company_id === company.id);
    const companyAppointments = filteredAppointments.filter((item) => item.company_id === company.id);

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
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Relatorios financeiros"
        description="Visao consolidada e por empresa para analise de faturamento e operacao."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Faturamento total" value={formatCurrency(platformRevenue)} />
        <StatCard label="Comissao total" value={formatCurrency(platformCommission)} />
        <StatCard label="Agendamentos totais" value={platformAppointments} className="col-span-2 md:col-span-1" />
      </div>

      <Panel title="Filtros">
        <form className="grid gap-3 sm:grid-cols-4">
          <div className="min-w-0 sm:col-span-2">
            <label htmlFor="empresa" className="mb-1 block text-sm font-medium text-foreground">
              Filtrar por empresa
            </label>
            <input
              id="empresa"
              name="empresa"
              type="text"
              list="master-companies"
              defaultValue={companySearchTerm}
              placeholder="Digite o nome da empresa"
              className={FIELD_CLASS}
            />
            <datalist id="master-companies">
              {companiesList.map((company) => (
                <option key={company.id} value={company.nome} />
              ))}
            </datalist>
          </div>
          <div className="min-w-0">
            <label htmlFor="dataInicio" className="mb-1 block text-sm font-medium text-foreground">
              Data inicial
            </label>
            <input id="dataInicio" name="dataInicio" type="date" defaultValue={startDateInput} className={FIELD_CLASS} />
          </div>
          <div className="min-w-0">
            <label htmlFor="dataFim" className="mb-1 block text-sm font-medium text-foreground">
              Data final
            </label>
            <input id="dataFim" name="dataFim" type="date" defaultValue={endDateInput} className={FIELD_CLASS} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-4">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand/90"
            >
              Aplicar filtro
            </button>
            <Link
              href="/master/relatorios"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground hover:border-brand"
            >
              Limpar
            </Link>
          </div>
        </form>
      </Panel>

      <Panel title="Resumo por empresa">
        {companySearchTerm ? (
          <p className="mb-2 text-sm text-muted-foreground">Filtro ativo: empresas com nome contendo &quot;{companySearchTerm}&quot;.</p>
        ) : null}
        {startDateInput || endDateInput ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Periodo ativo: {startDateInput || "inicio livre"} ate {endDateInput || "fim livre"}.
          </p>
        ) : null}

        {visibleCompanies.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
            Nenhuma empresa encontrada para o filtro informado.
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {visibleCompanies.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.nome}
                  status={<span className="text-sm font-semibold whitespace-nowrap tabular-nums text-foreground">{formatCurrency(item.totalRevenue)}</span>}
                  subtitle={`Comissao ${formatCurrency(item.totalCommission)} - ${item.totalAppointments} agend. - ${item.completedAppointments} concl.`}
                  actions={null}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Empresa</th>
                    <th className="py-2 pr-3 font-medium">Faturamento</th>
                    <th className="py-2 pr-3 font-medium">Comissao</th>
                    <th className="py-2 pr-3 font-medium">Agendamentos</th>
                    <th className="py-2 pr-3 font-medium">Concluidos</th>
                    <th className="py-2 pr-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {visibleCompanies.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 font-medium">{item.nome}</td>
                      <td className="py-3 pr-3">{formatCurrency(item.totalRevenue)}</td>
                      <td className="py-3 pr-3">{formatCurrency(item.totalCommission)}</td>
                      <td className="py-3 pr-3">{item.totalAppointments}</td>
                      <td className="py-3 pr-3">{item.completedAppointments}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">{item.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
