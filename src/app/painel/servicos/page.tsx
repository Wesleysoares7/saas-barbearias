import { redirect } from "next/navigation";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Plus, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/painel/ui/form-dialog";
import { CreateServiceForm } from "@/components/painel/servicos/create-service-form";
import { ServiceItemForm } from "@/components/painel/servicos/service-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { ListToolbar } from "@/components/painel/ui/list-toolbar";
import { Pagination, parsePageParam, sanitizeSearchTerm } from "@/components/painel/ui/pagination";
import { Panel } from "@/components/painel/ui/panel";
const PAGE_SIZE = 20;

type ServiceRow = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
  ativo: boolean;
};

export default async function ServicosPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "servicos")) {
    redirect("/painel");
  }

  const query = await searchParams;
  const term = sanitizeSearchTerm(query.q);
  const page = parsePageParam(query.pagina);
  const from = (page - 1) * PAGE_SIZE;

  let servicesQuery = supabase
    .from("services")
    .select("id, nome, duracao, valor, ativo", { count: "exact" })
    .eq("company_id", companyId);

  if (term) {
    servicesQuery = servicesQuery.ilike("nome", `%${term}%`);
  }

  const { data: services, count } = await servicesQuery
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const total = count ?? 0;

  const serviceRows: ServiceRow[] = (services ?? []) as ServiceRow[];

  return (
    <div className="space-y-5">
      <PageHeader icon={Scissors} title="Servicos" description="Cadastre e mantenha os servicos oferecidos pela sua empresa."
        actions={
          <>
<FormDialog
            title="Novo Servico"
            contentClassName="max-w-2xl"
            trigger={
              <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
                <Plus className="size-4 mr-2" />
                Novo Servico
              </Button>
            }
          >
            <CreateServiceForm />
          </FormDialog>
          </>
        }
      />

      <Panel title="Lista de servicos" description={`${total} cadastrado(s)`}>
        <div className="space-y-3">
          <ListToolbar placeholder="Buscar por nome" defaultValue={term} />

          {serviceRows.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              {term ? "Nenhum servico encontrado para essa busca." : "Nenhum servico cadastrado ainda."}
            </p>
          ) : (
            <div className="space-y-2">
              {serviceRows.map((service) => (
                <ServiceItemForm key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/painel/servicos" params={{ q: term }} />
      </Panel>
    </div>
  );
}