import { Suspense } from "react";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/painel/ui/page-header";
import { NavLinkPending } from "@/components/painel/ui/nav-link-pending";
import { PeriodPicker } from "@/components/painel/financeiro/period-picker";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import {
  monthStartInputValue,
  todayInputValue,
} from "@/lib/datetime";
import { FinanceiroContent } from "./financeiro-content";
import { FinanceiroSkeleton } from "./financeiro-skeleton";
import type { Tab, SearchParams } from "./types";

function normalizeDateInput(
  value: string | undefined,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "financeiro")) {
    redirect("/painel");
  }

  const defaultStart = monthStartInputValue();
  const defaultEnd = todayInputValue();

  const tab: Tab = ["caixa", "funcionarios", "pagamentos"].includes(
    resolvedSearchParams.aba ?? ""
  )
    ? (resolvedSearchParams.aba as Tab)
    : "resumo";
  const start = normalizeDateInput(resolvedSearchParams.start, defaultStart);
  const end = normalizeDateInput(resolvedSearchParams.end, defaultEnd);

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "caixa", label: "Caixa" },
    { id: "funcionarios", label: "Funcionarios" },
    { id: "pagamentos", label: "Pagamentos" },
  ];
  
  const tabHref = (id: Tab) =>
    `/painel/financeiro?${new URLSearchParams({
      aba: id,
      start,
      end,
    }).toString()}`;
  
  const tabClass = (active: boolean) =>
    `flex min-h-11 shrink-0 items-center justify-center border-b-2 px-4 text-sm font-medium transition ${
      active
        ? "border-brand text-brand"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        icon={Wallet}
        title="Financeiro"
        description="Registre pagamentos, acompanhe o faturamento total e veja a comissao por funcionario."
      />

      <PeriodPicker start={start} end={end} aba={tab} />

      <nav
        aria-label="Abas do financeiro"
        className="flex overflow-x-auto border-b border-border"
      >
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={tabHref(item.id)}
            className={`relative ${tabClass(tab === item.id)}`}
          >
            {item.label}
            <NavLinkPending />
          </Link>
        ))}
      </nav>

      <Suspense 
        key={`${tab}-${start}-${end}`} 
        fallback={<FinanceiroSkeleton />}
      >
        <FinanceiroContent 
          supabase={supabase}
          companyId={companyId}
          tab={tab}
          start={start}
          end={end}
        />
      </Suspense>
    </div>
  );
}
