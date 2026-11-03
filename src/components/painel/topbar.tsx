"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, LogOut } from "lucide-react";

import { signOutAction } from "@/app/painel/actions";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyLogo, isActivePath, type SidebarNavItem } from "@/components/painel/sidebar-nav";

type TopbarProps = {
  companyName: string;
  logoUrl?: string | null;
  roleLabel: string;
  items: SidebarNavItem[];
  userEmail: string;
  unreadCount: number;
  showNotifications: boolean;
};

export function Topbar({ items, companyName, logoUrl, roleLabel, userEmail, unreadCount, showNotifications }: TopbarProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const current = items
    .filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const label = current?.label ?? "Dashboard";
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div title={companyName} className="shrink-0 lg:hidden">
          <CompanyLogo
            logoUrl={logoUrl}
            companyName={companyName}
            className="flex size-9 items-center justify-center rounded-xl text-sm"
          />
        </div>
        <h1 className="truncate text-base font-semibold text-foreground lg:hidden">{label}</h1>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm lg:flex">
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted-foreground">Painel</span>
          <ChevronRight className="size-4 text-muted-foreground" />
          <span className="rounded-lg bg-brand/15 px-2.5 py-1 font-medium text-brand">{label}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {showNotifications ? (
          <Link
            href="/painel/notificacoes"
            aria-label="Notificacoes"
            className="relative flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title={userEmail}
          aria-label="Menu da conta"
          className="flex size-10 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground"
        >
          {initials}
        </button>
      </div>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minha conta</DialogTitle>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Empresa</dt>
              <dd className="text-foreground">{companyName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Usuario logado</dt>
              <dd className="break-all text-foreground">{userEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Papel de acesso</dt>
              <dd className="text-foreground">{roleLabel}</dd>
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
    </header>
  );
}
