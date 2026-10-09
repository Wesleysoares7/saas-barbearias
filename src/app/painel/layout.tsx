import { redirect } from "next/navigation";

import { endSupportSessionAction } from "@/app/master/actions";
import { MobileSidebarMenu } from "@/components/painel/mobile-sidebar-menu";
import { SidebarNav } from "@/components/painel/sidebar-nav";
import { Topbar } from "@/components/painel/topbar";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type PainelLayoutProps = {
  children: React.ReactNode;
};

export default async function PainelLayout({ children }: PainelLayoutProps) {
  const { supabase, companyId, role, redirectTo, supportMode, supportCompanyName, userId: contextUserId, userEmail: contextUserEmail } =
    await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  const [companyResponse, userResponse] = await Promise.all([
    supabase.from("companies").select("nome").eq("id", companyId).maybeSingle(),
    supportMode ? Promise.resolve(null) : supabase.auth.getUser(),
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
    ...(canAccessModule(role, "estoque")
      ? [{ href: "/painel/estoque", label: "Estoque", section: "Gestao", icon: "estoque" as const }]
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

  const isAdmin = role === "admin";
  const userId = supportMode ? contextUserId : userResponse?.data.user?.id;
  const userEmail = (supportMode ? contextUserEmail : userResponse?.data.user?.email) ?? "Usuario sem e-mail";
  let unreadCount = 0;

  if (isAdmin && userId && !supportMode) {
    const { count } = await supabase
      .from("security_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("recipient_id", userId);
    unreadCount = count ?? 0;
  }

  const companyName = companyResponse.data?.nome ?? "Minha empresa";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {supportMode ? (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
          <span className="min-w-0 truncate">Modo suporte: {supportCompanyName ?? companyName}</span>
          <form action={endSupportSessionAction}>
            <button type="submit" className="min-h-11 rounded-lg border border-current px-3 text-xs font-semibold sm:min-h-9">
              Sair do modo suporte
            </button>
          </form>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
      <SidebarNav items={navItems} companyName={companyName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar items={navItems} companyName={companyName} roleLabel={isAdmin ? "Administrador" : "Equipe"} userEmail={userEmail} unreadCount={unreadCount} showNotifications={isAdmin} />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <MobileSidebarMenu companyName={companyName} roleLabel={isAdmin ? "Administrador" : "Equipe"} userEmail={userEmail} items={navItems} />
      </div>
    </div>
  );
}
