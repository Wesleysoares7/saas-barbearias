import { redirect } from "next/navigation";
import Link from "next/link";

import {
  createMasterCompanyAction,
  deleteMasterCompanyAction,
  updateMasterCompanyAction,
} from "@/app/master/actions";
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
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/master/empresas"
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100"
            >
              Empresas
            </Link>
            <Link
              href="/master/relatorios"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/70"
            >
              Relatorios financeiros
            </Link>
          </div>
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
          <form action={createMasterCompanyAction} className="mb-5 grid gap-3 rounded-xl border border-zinc-700/70 bg-zinc-950/50 p-3 sm:grid-cols-4">
            <input
              name="nome"
              required
              minLength={2}
              placeholder="Nome da empresa"
              className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
            />
            <input
              name="telefone"
              placeholder="Telefone"
              className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
            />
            <input
              name="endereco"
              placeholder="Endereco"
              className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
            />
            <button
              type="submit"
              className="h-10 rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              Incluir empresa
            </button>
          </form>

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
            <div className="space-y-3">
              {companyList.map((company) => (
                <div key={company.id} className="grid gap-3 rounded-xl border border-zinc-700/70 bg-zinc-950/45 p-3 sm:grid-cols-5">
                  <Link
                    href={`/master/empresas/${company.id}`}
                    className="truncate text-sm font-semibold text-emerald-200 underline-offset-2 hover:underline sm:col-span-5"
                  >
                    {company.nome}
                  </Link>
                  <form action={updateMasterCompanyAction} className="contents">
                    <input type="hidden" name="id" value={company.id} />
                    <input
                      name="nome"
                      required
                      minLength={2}
                      defaultValue={company.nome}
                      className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                    />
                    <input
                      name="telefone"
                      defaultValue={company.telefone ?? ""}
                      className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                    />
                    <input
                      name="endereco"
                      defaultValue={company.endereco ?? ""}
                      className="h-10 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="h-10 rounded-lg border border-sky-500/60 bg-sky-500/15 px-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25"
                    >
                      Salvar alteracoes
                    </button>
                  </form>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-xs text-zinc-400">Criada em: {formatDate(company.created_at)}</span>
                    <span className="text-[11px] text-zinc-500">ID: {company.id}</span>
                    <form action={deleteMasterCompanyAction}>
                      <input type="hidden" name="id" value={company.id} />
                      <input
                        name="nome_confirmacao"
                        required
                        placeholder="Digite o nome para excluir"
                        aria-label={`Digite o nome ${company.nome} para confirmar a exclusao`}
                        className="mb-2 h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 text-xs text-zinc-100 outline-none focus:border-rose-400"
                      />
                      <button
                        type="submit"
                        className="h-9 rounded-lg border border-rose-500/60 bg-rose-500/15 px-3 text-xs font-medium text-rose-100 transition hover:bg-rose-500/25"
                      >
                        Excluir empresa
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
