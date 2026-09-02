import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateCustomerForm } from "@/components/painel/clientes/create-customer-form";
import { CustomerCard } from "@/components/painel/clientes/customer-card";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import type { CustomerRow } from "@/types";

export default async function ClientesPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "clientes")) {
    redirect("/painel");
  }

  const customersResponse = await supabase
    .from("customers")
    .select("id, nome, telefone, email, observacoes, ativo")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const hasCustomerTableIssue = Boolean(customersResponse.error?.message.includes("customers"));
  const customerRows: CustomerRow[] = (customersResponse.data ?? []) as CustomerRow[];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-300">Cadastre e mantenha sua base de clientes com dados de contato.</p>
        </div>

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
      </header>

      {hasCustomerTableIssue ? (
        <div className="rounded-lg border border-rose-500/35 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
          Seu banco ainda nao foi atualizado para clientes. Execute o script docs/database/005_etapa13_clientes.sql no Supabase SQL Editor.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-100">Lista de clientes</h2>
              <span className="text-sm text-zinc-400">{customerRows.length} cliente{customerRows.length !== 1 ? 's' : ''}</span>
            </div>

            {customerRows.length === 0 ? (
              <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                Nenhum cliente cadastrado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customerRows.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}