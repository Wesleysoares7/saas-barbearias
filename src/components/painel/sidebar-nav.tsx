"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellRing,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Scissors,
  Shield,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { signOutAction } from "@/app/painel/actions";

export type SidebarNavItem = {
  href: string;
  label: string;
  section: string;
  icon:
    | "dashboard"
    | "agendamentos"
    | "relatorios"
    | "clientes"
    | "funcionarios"
    | "servicos"
    | "financeiro"
    | "equipe"
    | "auditoria"
    | "notificacoes";
};

type SidebarNavProps = {
  items: SidebarNavItem[];
  companyName: string;
};

const STORAGE_KEY = "painel-sidebar-expanded";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/painel") {
    return pathname === "/painel";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getIcon(icon: SidebarNavItem["icon"]): LucideIcon {
  const icons: Record<SidebarNavItem["icon"], LucideIcon> = {
    dashboard: LayoutDashboard,
    agendamentos: CalendarClock,
    relatorios: FileBarChart2,
    clientes: Users,
    funcionarios: UserRound,
    servicos: Scissors,
    financeiro: Wallet,
    equipe: Users,
    auditoria: Shield,
    notificacoes: BellRing,
  };

  return icons[icon];
}

export function SidebarNav({ items, companyName }: SidebarNavProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const sections = [...new Set(items.map((item) => item.section))];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setExpanded(window.localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        // localStorage indisponivel: mantem recolhido
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignora falhas de persistencia
    }
  }

  return (
    <aside
      className={`relative z-30 hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block ${
        expanded ? "w-60" : "w-16"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={expanded ? "Recolher menu" : "Expandir menu"}
        className="absolute top-4 -right-3 z-20 flex size-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground transition hover:text-brand"
      >
        {expanded ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>

      <div className="sticky top-0 flex h-screen flex-col py-3">
        <div className={`flex items-center gap-3 pb-3 ${expanded ? "px-3" : "justify-center"}`}>
          <div
            title={companyName}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-bold text-brand-foreground"
          >
            {companyName.charAt(0).toUpperCase()}
          </div>
          {expanded ? <span className="truncate text-sm font-semibold text-foreground">{companyName}</span> : null}
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2" aria-label="Navegacao principal do painel">
          {sections.map((section) => (
            <div key={section} className="flex flex-col gap-1">
              {expanded ? (
                <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{section}</p>
              ) : null}

              {items
                .filter((item) => item.section === section)
                .map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = getIcon(item.icon);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition ${
                        expanded ? "w-full px-3" : "mx-auto w-10 justify-center"
                      } ${active ? "bg-brand/15 text-brand" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}
                    >
                      <Icon className="size-5 shrink-0" />
                      {expanded ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="px-3 pt-2">
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className={`flex h-10 items-center gap-3 rounded-xl text-sm font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-rose-300 ${
                expanded ? "w-full px-3" : "mx-auto w-10 justify-center"
              }`}
            >
              <LogOut className="size-5 shrink-0" />
              {expanded ? <span>Sair</span> : null}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
