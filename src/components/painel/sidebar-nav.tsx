"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarNavItem = {
  href: string;
  label: string;
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

export function SidebarNav({ items, orientation = "vertical" }: SidebarNavProps) {
  const pathname = usePathname();
  const isVertical = orientation === "vertical";

  return (
    <nav
      className={isVertical ? "space-y-1.5" : "flex gap-2 overflow-x-auto pb-1"}
      aria-label="Navegacao principal do painel"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isVertical
                ? `block rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100"
                      : "border-zinc-700/70 bg-zinc-900/50 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/70"
                  }`
                : `shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100"
                      : "border-zinc-700/70 bg-zinc-900/50 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/70"
                  }`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
