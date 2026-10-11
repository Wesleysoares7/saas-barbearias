"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BarChart3, Building2, ChevronRight, LogOut, type LucideIcon } from "lucide-react";

import { signOutAction } from "@/app/painel/actions";
import { NavLinkPending } from "@/components/painel/ui/nav-link-pending";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MasterShellProps = {
  userEmail: string;
  children: ReactNode;
};

type MasterNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const NAV_ITEMS: MasterNavItem[] = [
  { href: "/master/empresas", label: "Empresas", shortLabel: "Empresas", icon: Building2 },
  { href: "/master/relatorios", label: "Relatorios financeiros", shortLabel: "Relatorios", icon: BarChart3 },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MasterShell({ userEmail, children }: MasterShellProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));
  const label = current?.label ?? "Empresas";
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative z-30 hidden w-16 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 flex h-screen flex-col items-center py-3">
          <nav aria-label="Navegacao da area master" className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex size-10 items-center justify-center rounded-xl transition ${
                    active ? "bg-brand/15 text-brand" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-5" />
                  <NavLinkPending />
                </Link>
              );
            })}
          </nav>

          <form action={signOutAction}>
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-surface-2 hover:text-rose-300"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground lg:hidden">{label}</h1>
            <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm lg:flex">
              <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted-foreground">Area master</span>
              <ChevronRight className="size-4 text-muted-foreground" />
              <span className="rounded-lg bg-brand/15 px-2.5 py-1 font-medium text-brand">{label}</span>
            </nav>
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title={userEmail}
            aria-label="Menu da conta"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground"
          >
            {initials}
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <nav
        aria-label="Navegacao inferior da area master"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-brand" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5" />
              <span>{item.shortLabel}</span>
              <NavLinkPending />
            </Link>
          );
        })}
        <form action={signOutAction} className="flex flex-1">
          <button
            type="submit"
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <LogOut className="size-5" />
            <span>Sair</span>
          </button>
        </form>
      </nav>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minha conta</DialogTitle>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Usuario logado</dt>
              <dd className="break-all text-foreground">{userEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Papel de acesso</dt>
              <dd className="text-foreground">Dono da plataforma</dd>
            </div>
          </dl>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground transition hover:border-rose-400 hover:text-rose-300"
            >
              <LogOut className="size-4" />
              Sair da conta
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
