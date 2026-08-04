import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateServiceForm } from "@/components/painel/servicos/create-service-form";
import { ServiceItemForm } from "@/components/painel/servicos/service-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type ServiceRow = {
  id: string;
  nome: string;
  duracao: number;
  valor: number;
  ativo: boolean;
};

export default async function ServicosPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "servicos")) {
    redirect("/painel");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, nome, duracao, valor, ativo")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const serviceRows: ServiceRow[] = (services ?? []) as ServiceRow[];

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Servicos</h1>
            <p className="text-sm text-zinc-300">Cadastre e mantenha os servicos oferecidos pela sua empresa.</p>
          </div>

          <Link href="/painel" className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-amber-400 hover:text-amber-300">
            Voltar ao painel
          </Link>
        </header>

        <CreateServiceForm />

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Lista de servicos</h2>

          {serviceRows.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
              Nenhum servico cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {serviceRows.map((service) => (
                <ServiceItemForm key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
