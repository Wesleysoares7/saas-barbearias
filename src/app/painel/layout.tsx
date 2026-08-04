import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { signOutAction } from "@/app/painel/actions";
import { SidebarNav } from "@/components/painel/sidebar-nav";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type PainelLayoutProps = {
  children: React.ReactNode;
};

export default async function PainelLayout({ children }: PainelLayoutProps) {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  const [companyResponse, userResponse] = await Promise.all([
    supabase.from("companies").select("nome").eq("id", companyId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const navItems = [
    { href: "/painel", label: "Dashboard", section: "Operacao", icon: "dashboard" as const },
    { href: "/painel/agendamentos", label: "Agendamentos", section: "Operacao", icon: "agendamentos" as const },
    { href: "/painel/relatorios", label: "Relatorios", section: "Operacao", icon: "relatorios" as const },
    ...(canAccessModule(role, "clientes")
      ? [{ href: "/painel/clientes", label: "Clientes", section: "Gestao", icon: "clientes" as const }]
      : []),
    ...(canAccessModule(role, "funcionarios")
      ? [{ href: "/painel/funcionarios", label: "Funcionarios", section: "Gestao", icon: "funcionarios" as const }]
      : []),
    ...(canAccessModule(role, "servicos")
      ? [{ href: "/painel/servicos", label: "Servicos", section: "Gestao", icon: "servicos" as const }]
      : []),
    ...(canAccessModule(role, "financeiro")
      ? [{ href: "/painel/financeiro", label: "Financeiro", section: "Gestao", icon: "financeiro" as const }]
      : []),
    ...(canAccessModule(role, "equipe")
      ? [{ href: "/painel/equipe", label: "Equipe", section: "Administracao", icon: "equipe" as const }]
      : []),
    ...(canAccessModule(role, "auditoria")
      ? [{ href: "/painel/auditoria", label: "Auditoria", section: "Seguranca", icon: "auditoria" as const }]
      : []),
    ...(canAccessModule(role, "notificacoes")
      ? [{ href: "/painel/notificacoes", label: "Notificacoes", section: "Seguranca", icon: "notificacoes" as const }]
      : []),
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.24),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_35%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <details className="group mb-4 rounded-2xl border border-zinc-700/70 bg-zinc-900/85 p-3 backdrop-blur lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-fuchsia-300 uppercase">Menu</p>
              <p className="text-sm text-zinc-200">{companyResponse.data?.nome ?? "Minha empresa"}</p>
            </div>

            <ChevronDown className="size-4 text-zinc-400 transition group-open:rotate-180" />
          </summary>

          <div className="mt-3 space-y-3 border-t border-zinc-700/70 pt-3">
            <SidebarNav items={navItems} orientation="vertical" />

            <div className="space-y-2 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-400">{userResponse.data.user?.email ?? "Usuario sem e-mail"}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-rose-400 hover:text-rose-300"
                >
                  Sair da conta
                </button>
              </form>
            </div>
          </div>
        </details>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
          <aside className="hidden rounded-2xl border border-zinc-700/70 bg-zinc-900/85 p-4 shadow-2xl backdrop-blur lg:block lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="mb-4 border-b border-zinc-700/70 pb-4">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-fuchsia-300 uppercase">SaaS Barbearias</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">{companyResponse.data?.nome ?? "Minha empresa"}</h2>
              <p className="mt-1 text-xs text-zinc-400">{role === "admin" ? "Administrador" : "Equipe"}</p>
            </div>

            <SidebarNav items={navItems} orientation="vertical" />

            <div className="mt-6 border-t border-zinc-700/70 pt-4">
              <p className="mb-2 text-xs text-zinc-400">{userResponse.data.user?.email ?? "Usuario sem e-mail"}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-rose-400 hover:text-rose-300"
                >
                  Sair da conta
                </button>
              </form>
            </div>
          </aside>

          <section className="min-h-[70vh] rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-4 shadow-2xl backdrop-blur sm:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
