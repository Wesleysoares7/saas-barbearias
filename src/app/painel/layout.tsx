import { redirect } from "next/navigation";

import { endSupportSessionAction } from "@/app/master/actions";
import { MobileSidebarMenu } from "@/components/painel/mobile-sidebar-menu";
import { SidebarNav } from "@/components/painel/sidebar-nav";
import { Topbar } from "@/components/painel/topbar";
import { PendingButton } from "@/components/ui/pending-button";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { getSupportContact, whatsappLink } from "@/lib/billing/contact";

type PainelLayoutProps = {
  children: React.ReactNode;
};

export default async function PainelLayout({ children }: PainelLayoutProps) {
  const {
    supabase,
    companyId,
    role,
    redirectTo,
    supportMode,
    supportCompanyName,
    billing,
    userId: contextUserId,
    userEmail: contextUserEmail,
    employeeId,
  } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  const [companyResponse, userResponse] = await Promise.all([
    supabase.from("companies").select("nome, logo").eq("id", companyId).maybeSingle(),
    supportMode ? Promise.resolve(null) : supabase.auth.getUser(),
  ]);

  const navItems = [
    {
      href: "/painel",
      label: "Dashboard",
      section: "Operacao",
      icon: "dashboard" as const,
    },
    {
      href: "/painel/agendamentos",
      label: "Agendamentos",
      section: "Operacao",
      icon: "agendamentos" as const,
    },
    ...(role === "admin"
      ? [
          {
            href: "/painel/relatorios",
            label: "Relatorios",
            section: "Operacao",
            icon: "relatorios" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "minha_comissao", employeeId)
      ? [
          {
            href: "/painel/minha-comissao",
            label: "Minha comissao",
            section: "Operacao",
            icon: "minha_comissao" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "clientes")
      ? [
          {
            href: "/painel/clientes",
            label: "Clientes",
            section: "Gestao",
            icon: "clientes" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "funcionarios")
      ? [
          {
            href: "/painel/funcionarios",
            label: "Funcionarios",
            section: "Gestao",
            icon: "funcionarios" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "servicos")
      ? [
          {
            href: "/painel/servicos",
            label: "Servicos",
            section: "Gestao",
            icon: "servicos" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "estoque")
      ? [
          {
            href: "/painel/estoque",
            label: "Estoque",
            section: "Gestao",
            icon: "estoque" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "financeiro")
      ? [
          {
            href: "/painel/financeiro",
            label: "Financeiro",
            section: "Gestao",
            icon: "financeiro" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "equipe")
      ? [
          {
            href: "/painel/equipe",
            label: "Equipe",
            section: "Administracao",
            icon: "equipe" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "configuracoes")
      ? [
          {
            href: "/painel/configuracoes",
            label: "Configuracoes",
            section: "Administracao",
            icon: "configuracoes" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "auditoria")
      ? [
          {
            href: "/painel/auditoria",
            label: "Auditoria",
            section: "Seguranca",
            icon: "auditoria" as const,
          },
        ]
      : []),
    ...(canAccessModule(role, "notificacoes")
      ? [
          {
            href: "/painel/notificacoes",
            label: "Notificacoes",
            section: "Seguranca",
            icon: "notificacoes" as const,
          },
        ]
      : []),
  ];

  const isAdmin = role === "admin";
  const userId = supportMode ? contextUserId : userResponse?.data.user?.id;
  const userEmail =
    (supportMode ? contextUserEmail : userResponse?.data.user?.email) ??
    "Usuario sem e-mail";
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
  const logoPath = companyResponse.data?.logo;
  const logoUrl =
    typeof logoPath === "string" && logoPath
      ? supabase.storage.from("company-logos").getPublicUrl(logoPath).data.publicUrl
      : null;
  const contact = getSupportContact();
  const contactHref = contact.whatsapp
    ? whatsappLink(contact.whatsapp)
    : contact.email
      ? `mailto:${contact.email}`
      : null;
  const days = billing?.trialDaysLeft ?? 0;
  const dayLabel = days === 1 ? "1 dia" : `${days} dias`;
  let bannerText: string | null = null;
  let bannerTone = "bg-sky-400/10 text-sky-200";

  if (!supportMode && isAdmin && billing?.banner) {
    if (billing.banner === "trial") {
      bannerText = `Periodo de teste: restam ${dayLabel}.`;
    } else if (billing.banner === "trial_ending") {
      bannerText =
        days === 0
          ? "Seu teste termina hoje. Fale com o suporte para continuar."
          : `Seu teste termina em ${dayLabel}. Fale com o suporte para continuar.`;
      bannerTone = "bg-amber-400/15 text-amber-200";
    } else {
      bannerText =
        "Pagamento em atraso. Regularize para evitar a suspensao da conta.";
      bannerTone = "bg-amber-400/15 text-amber-200";
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {supportMode ? (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
          <span className="min-w-0 truncate">
            Modo suporte: {supportCompanyName ?? companyName}
            {billing
              ? ` | Status: ${billing.status}${billing.status === "trial" && billing.trialDaysLeft !== null ? `, restam ${billing.trialDaysLeft} dias` : ""}`
              : ""}
          </span>
          <form action={endSupportSessionAction}>
            <PendingButton
              type="submit"
              variant="ghost"
              pendingLabel="Encerrando..."
              className="h-auto min-h-11 gap-1.5 rounded-lg border-current px-3 text-xs text-inherit hover:bg-transparent hover:text-inherit sm:min-h-9"
            >
              Sair do modo suporte
            </PendingButton>
          </form>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <SidebarNav items={navItems} companyName={companyName} logoUrl={logoUrl} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            items={navItems}
            companyName={companyName}
            logoUrl={logoUrl}
            roleLabel={isAdmin ? "Administrador" : "Equipe"}
            userEmail={userEmail}
            unreadCount={unreadCount}
            showNotifications={isAdmin}
          />

          {bannerText ? (
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6 ${bannerTone}`}
            >
              <span>{bannerText}</span>
              {contactHref ? (
                <a
                  href={contactHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center font-semibold underline sm:min-h-0"
                >
                  Falar com o suporte
                </a>
              ) : null}
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
            {children}
          </main>
        </div>

        <MobileSidebarMenu
          companyName={companyName}
          logoUrl={logoUrl}
          roleLabel={isAdmin ? "Administrador" : "Equipe"}
          userEmail={userEmail}
          items={navItems}
        />
      </div>
    </div>
  );
}
