"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";

import { signOutAction } from "@/app/painel/actions";
import { getIcon, isActivePath, type SidebarNavItem } from "@/components/painel/sidebar-nav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MobileSidebarMenuProps = {
  companyName: string;
  roleLabel: string;
  userEmail: string;
  items: SidebarNavItem[];
};

export function MobileSidebarMenu({ companyName, roleLabel, userEmail, items }: MobileSidebarMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const preferred = ["/painel", "/painel/agendamentos", "/painel/clientes", "/painel/financeiro"];
  const found = preferred
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is SidebarNavItem => Boolean(item));
  const reports = items.find((item) => item.href === "/painel/relatorios");
  const shortcuts = found.length < 4 && reports ? [...found, reports] : found;
  const shortcutHrefs = new Set(shortcuts.map((item) => item.href));
  const others = items.filter((item) => !shortcutHrefs.has(item.href));
  const moreActive = others.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Navegacao inferior do painel"
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {shortcuts.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = getIcon(item.icon);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 ${
                active ? "text-brand" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span className="w-full truncate text-center text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 ${
            moreActive ? "text-brand" : "text-muted-foreground"
          }`}
        >
          <Menu className="size-5" />
          <span className="w-full truncate text-center text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>

          <div className="grid gap-1">
            {others.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = getIcon(item.icon);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                    active ? "bg-brand/15 text-brand" : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border pt-4">
            <dl className="mb-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Empresa</dt>
                <dd className="truncate text-foreground">{companyName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Usuario</dt>
                <dd className="truncate text-foreground">{userEmail}</dd>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
