"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  FileBarChart2,
  LayoutDashboard,
  Scissors,
  Shield,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

type SidebarNavItem = {
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
  orientation?: "vertical" | "horizontal";
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/painel") {
    return pathname === "/painel";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getIcon(icon: SidebarNavItem["icon"]) {
  if (icon === "dashboard") {
    return LayoutDashboard;
  }

  if (icon === "agendamentos") {
    return CalendarClock;
  }

  if (icon === "relatorios") {
    return FileBarChart2;
  }

  if (icon === "clientes") {
    return Users;
  }

  if (icon === "funcionarios") {
    return UserRound;
  }

  if (icon === "servicos") {
    return Scissors;
  }

  if (icon === "financeiro") {
    return Wallet;
  }

  if (icon === "equipe") {
    return Users;
  }

  if (icon === "auditoria") {
    return Shield;
  }

  return BellRing;
}

export function SidebarNav({ items, orientation = "vertical" }: SidebarNavProps) {
  const pathname = usePathname();
  const isVertical = orientation === "vertical";
  const sections = [...new Set(items.map((item) => item.section))];

  if (!isVertical) {
    return (
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegacao principal do painel">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = getIcon(item.icon);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                active
                  ? "border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100"
                  : "border-zinc-700/70 bg-zinc-900/50 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/70"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-4" aria-label="Navegacao principal do painel">
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);

        return (
          <div key={section} className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">{section}</p>

            {sectionItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = getIcon(item.icon);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group block rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_10px_30px_-22px_rgba(217,70,239,0.9)]"
                      : "border-zinc-700/70 bg-zinc-900/50 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/70"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className={`size-4 ${active ? "text-fuchsia-200" : "text-zinc-400 group-hover:text-zinc-200"}`} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
