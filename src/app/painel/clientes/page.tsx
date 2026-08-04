import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateCustomerForm } from "@/components/painel/clientes/create-customer-form";
import { CustomerItemForm } from "@/components/painel/clientes/customer-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type CustomerRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
};

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
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Clientes</h1>
            <p className="text-sm text-zinc-300">Cadastre e mantenha sua base de clientes com dados de contato.</p>
          </div>

          <Link
            href="/painel"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-amber-400 hover:text-amber-300"
          >
            Voltar ao painel
          </Link>
        </header>

        {hasCustomerTableIssue ? (
          <div className="rounded-lg border border-rose-500/35 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
            Seu banco ainda nao foi atualizado para clientes. Execute o script docs/database/005_etapa13_clientes.sql no Supabase SQL Editor.
          </div>
        ) : (
          <>
            <CreateCustomerForm />

            <div className="space-y-3">
              <h2 className="text-lg font-medium text-zinc-100">Lista de clientes</h2>

              {customerRows.length === 0 ? (
                <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                  Nenhum cliente cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {customerRows.map((customer) => (
                    <CustomerItemForm key={customer.id} customer={customer} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
