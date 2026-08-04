"use client";

import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/painel/actions";
import { SidebarNav, type SidebarNavItem } from "@/components/painel/sidebar-nav";

type MobileSidebarMenuProps = {
  companyName: string;
  userEmail: string;
  items: SidebarNavItem[];
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/painel") {
    return pathname === "/painel";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileSidebarMenu({ companyName, userEmail, items }: MobileSidebarMenuProps) {
  const pathname = usePathname();
  const activeItem = items.find((item) => isActivePath(pathname, item.href)) ?? items[0];

  return (
    <details className="group mb-4 rounded-2xl border border-zinc-700/70 bg-zinc-900/85 p-3 backdrop-blur lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-fuchsia-300 uppercase">Menu</p>
          <p className="text-sm text-zinc-200">{companyName}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-fuchsia-200 uppercase">
            {activeItem?.label ?? "Painel"}
          </span>
          <ChevronDown className="size-4 text-zinc-400 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
        <div className="overflow-hidden">
          <div className="mt-3 space-y-3 border-t border-zinc-700/70 pt-3">
            <SidebarNav items={items} orientation="vertical" closeOnNavigate />

            <div className="space-y-2 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-400">{userEmail}</p>
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
        </div>
      </div>
    </details>
  );
}
