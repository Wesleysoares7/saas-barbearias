import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ExternalLink, LifeBuoy } from "lucide-react";

import { startSupportSessionAction } from "@/app/master/actions";
import { NewCompanyDialog } from "@/components/master/new-company-dialog";
import { ListRow, ROW_ICON_BUTTON_CLASS, getInitials } from "@/components/painel/ui/list-row";
import { ListToolbar } from "@/components/painel/ui/list-toolbar";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Pagination, parsePageParam, sanitizeSearchTerm } from "@/components/painel/ui/pagination";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { getPlatformAccessContext } from "@/lib/auth/access";
import { billingPill } from "@/lib/billing/labels";
import { resolveBillingState } from "@/lib/billing/state";
import { formatDateBR } from "@/lib/datetime";
import { StatusPill } from "@/components/painel/ui/status-pill";

const PAGE_SIZE = 20;

type CompanyRow = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
  status: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  billing_exempt: boolean | null;
};

const STATUS_FILTERS = [
  { key: "", label: "Todas" },
  { key: "trial", label: "Trial" },
  { key: "active", label: "Ativas" },
  { key: "past_due", label: "Em atraso" },
  { key: "suspended", label: "Suspensas" },
  { key: "canceled", label: "Canceladas" },
  { key: "cortesia", label: "Cortesia" },
];

type MasterCompaniesPageProps = {
  searchParams?: Promise<{ q?: string; pagina?: string; status?: string }>;
};

function formatDate(dateIso: string): string {
  const formatted = formatDateBR(dateIso);

  return formatted === "-" ? "Data invalida" : formatted;
}

export default async function MasterCompaniesPage({ searchParams }: MasterCompaniesPageProps) {
  const { supabase, redirectTo } = await getPlatformAccessContext();

  if (redirectTo) {
    redirect(redirectTo);
  }

  const resolved = (await searchParams) ?? {};
  const term = sanitizeSearchTerm(resolved.q);
  const page = parsePageParam(resolved.pagina);
  const statusFilter = STATUS_FILTERS.some((item) => item.key === resolved.status) ? (resolved.status ?? "") : "";
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("companies")
    .select("id, nome, telefone, endereco, created_at, status, plan, trial_ends_at, suspended_at, billing_exempt", { count: "exact" })
    .order("created_at", { ascending: false });

  if (term) {
    query = query.ilike("nome", `%${term}%`);
  }

  if (statusFilter === "cortesia") {
    query = query.eq("billing_exempt", true);
  } else if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: companies, count, error: companiesError } = await query.range(from, from + PAGE_SIZE - 1);

  const companyList = ((companies ?? []) as CompanyRow[]).filter((company) => Boolean(company.id));
  const total = count ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Building2}
        title="Empresas"
        description="Visao global da plataforma"
        actions={<NewCompanyDialog />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total de empresas" value={total} icon={Building2} />
      </div>

      <Panel title="Empresas cadastradas">
        <div className="space-y-4">
          <ListToolbar placeholder="Buscar por nome da empresa" defaultValue={term} />

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => {
              const search = new URLSearchParams();
              if (term) search.set("q", term);
              if (item.key) search.set("status", item.key);
              const href = `/master/empresas${search.size ? `?${search.toString()}` : ""}`;
              const active = item.key === statusFilter;

              return (
                <Link
                  key={item.key || "todas"}
                  href={href}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
                    active ? "border-brand bg-brand/15 text-brand" : "border-border bg-surface-2 text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {companiesError ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              Nao foi possivel carregar as empresas. Tente novamente.
            </p>
          ) : null}

          {!companiesError && companyList.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              {term ? "Nenhuma empresa encontrada para a busca." : "Nenhuma empresa cadastrada ate o momento. Use Nova empresa para comecar."}
            </p>
          ) : null}

          {!companiesError && companyList.length > 0 ? (
            <div className="space-y-2">
              {companyList.map((company) => {
                const billing = resolveBillingState(company);
                const pill = billingPill(billing);

                return (
                <ListRow
                  key={company.id}
                  leading={getInitials(company.nome)}
                  title={company.nome}
                  subtitle={`${company.telefone ?? "Sem telefone"} - criada em ${formatDate(company.created_at)}`}
                  status={
                    <span className="inline-flex flex-wrap gap-1">
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                      {billing.billingExempt ? <StatusPill tone="brand">Cortesia</StatusPill> : null}
                    </span>
                  }
                  columns={[
                    { label: "Endereco", value: company.endereco ?? "-" },
                    { label: "Criada em", value: formatDate(company.created_at) },
                  ]}
                  actions={
                    <>
                      <Link
                        href={`/master/empresas/${company.id}`}
                        className={ROW_ICON_BUTTON_CLASS}
                        aria-label={`Abrir ${company.nome}`}
                        title="Abrir"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <form action={startSupportSessionAction}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <button
                          type="submit"
                          className={ROW_ICON_BUTTON_CLASS}
                          aria-label={`Modo suporte em ${company.nome}`}
                          title="Modo suporte"
                        >
                          <LifeBuoy className="size-4" />
                        </button>
                      </form>
                    </>
                  }
                />
                );
              })}
            </div>
          ) : null}

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/master/empresas" params={{ q: term || undefined, status: statusFilter || undefined }} />
        </div>
      </Panel>
    </div>
  );
}
