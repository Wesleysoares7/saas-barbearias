import { redirect } from "next/navigation";

import { signOutAction } from "@/app/painel/actions";
import { getPlatformAccessContext } from "@/lib/auth/access";

type CompanyRow = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  created_at: string;
};

function formatDate(dateIso: string) {
  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function MasterCompaniesPage() {
  const { supabase, redirectTo } = await getPlatformAccessContext();

  if (redirectTo) {
    redirect(redirectTo);
  }

  const [{ data: companies, error: companiesError }, userResponse] = await Promise.all([
    supabase.from("companies").select("id, nome, telefone, endereco, created_at").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const companyList = ((companies ?? []) as CompanyRow[]).filter((company) => Boolean(company.id));

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.20),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_35%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="mb-6 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur sm:p-5">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-300 uppercase">Area master</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Empresas cadastradas</h1>
              <p className="mt-1 text-sm text-zinc-300">Visao global da plataforma para operacao e futura cobranca por uso.</p>
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

        <section className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-4 shadow-2xl backdrop-blur sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Total de empresas: {companyList.length}</h2>
          </div>

          {companiesError ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              Nao foi possivel carregar as empresas: {companiesError.message}
            </p>
          ) : null}

          {!companiesError && companyList.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/70 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">Nenhuma empresa cadastrada ate o momento.</p>
          ) : null}

          {!companiesError && companyList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] divide-y divide-zinc-700 text-sm">
                <thead>
                  <tr className="text-left text-zinc-300">
                    <th className="py-2 pr-3 font-medium">Empresa</th>
                    <th className="py-2 pr-3 font-medium">Telefone</th>
                    <th className="py-2 pr-3 font-medium">Endereco</th>
                    <th className="py-2 pr-3 font-medium">Criada em</th>
                    <th className="py-2 pr-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
                  {companyList.map((company) => (
                    <tr key={company.id}>
                      <td className="py-3 pr-3 font-medium">{company.nome}</td>
                      <td className="py-3 pr-3">{company.telefone || "-"}</td>
                      <td className="py-3 pr-3">{company.endereco || "-"}</td>
                      <td className="py-3 pr-3">{formatDate(company.created_at)}</td>
                      <td className="py-3 pr-3 text-xs text-zinc-400">{company.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
