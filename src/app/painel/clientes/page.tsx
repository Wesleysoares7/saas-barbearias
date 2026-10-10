import { redirect } from "next/navigation";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateCustomerForm } from "@/components/painel/clientes/create-customer-form";
import { CustomerItemForm } from "@/components/painel/clientes/customer-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { ListToolbar } from "@/components/painel/ui/list-toolbar";
import { Pagination, parsePageParam, sanitizeSearchTerm } from "@/components/painel/ui/pagination";
import { Panel } from "@/components/painel/ui/panel";import type { CustomerRow } from "@/types";

const PAGE_SIZE = 20;

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "clientes")) {
    redirect("/painel");
  }

  const query = await searchParams;
  const term = sanitizeSearchTerm(query.q);
  const page = parsePageParam(query.pagina);
  const from = (page - 1) * PAGE_SIZE;

  let customersQuery = supabase
    .from("customers")
    .select("id, nome, telefone, email, observacoes, ativo", { count: "exact" })
    .eq("company_id", companyId);

  if (term) {
    customersQuery = customersQuery.or(`nome.ilike.%${term}%,telefone.ilike.%${term}%`);
  }

  const customersResponse = await customersQuery
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const total = customersResponse.count ?? 0;

  const hasCustomerTableIssue = Boolean(customersResponse.error?.message.includes("customers"));
  const customerRows: CustomerRow[] = (customersResponse.data ?? []) as CustomerRow[];

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Clientes" description="Cadastre e mantenha sua base de clientes com dados de contato."
        actions={
          <>
<Dialog>
          <DialogTrigger asChild>
            <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
              <Plus className="size-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <CreateCustomerForm />
          </DialogContent>
        </Dialog>
          </>
        }
      />

      {hasCustomerTableIssue ? (
        <div className="rounded-lg border border-rose-500/35 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
          Seu banco ainda nao foi atualizado para clientes. Execute o script docs/database/005_etapa13_clientes.sql no Supabase SQL Editor.
        </div>
      ) : (
        <>
          <Panel title="Lista de clientes" description={`${total} cadastrado(s)`}>
            <div className="space-y-3">
              <ListToolbar placeholder="Buscar por nome ou telefone" defaultValue={term} />

              {customerRows.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
                  {term ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado ainda."}
                </p>
              ) : (
                <div className="space-y-2">
                  {customerRows.map((customer) => (
                    <CustomerItemForm key={customer.id} customer={customer} />
                  ))}
                </div>
              )}
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/painel/clientes" params={{ q: term }} />
          </Panel>
        </>
      )}
    </div>
  );
}
