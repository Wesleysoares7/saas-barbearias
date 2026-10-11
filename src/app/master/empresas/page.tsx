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
import { formatDateBR } from "@/lib/datetime";

const PAGE_SIZE = 20;

type CompanyRow = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
};

type MasterCompaniesPageProps = {
  searchParams?: Promise<{ q?: string; pagina?: string }>;
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
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("companies")
    .select("id, nome, telefone, endereco, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (term) {
    query = query.ilike("nome", `%${term}%`);
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
              {companyList.map((company) => (
                <ListRow
                  key={company.id}
                  leading={getInitials(company.nome)}
                  title={company.nome}
                  subtitle={`${company.telefone ?? "Sem telefone"} - criada em ${formatDate(company.created_at)}`}
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
              ))}
            </div>
          ) : null}

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/master/empresas" params={{ q: term || undefined }} />
        </div>
      </Panel>
    </div>
  );
}
