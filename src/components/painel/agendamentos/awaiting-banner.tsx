import Link from "next/link";
import { BellRing } from "lucide-react";

import type { getAccessContext } from "@/lib/auth/access";

type Supabase = Awaited<ReturnType<typeof getAccessContext>>["supabase"];

export async function AwaitingBanner({
  supabase,
  companyId,
  employeeId,
}: {
  supabase: Supabase;
  companyId: string;
  employeeId: string | null;
}) {
  let query = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "aguardando");

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { count } = await query;

  if (!count) {
    return null;
  }

  return (
    <Link
      href="/painel/agendamentos?periodo=todos"
      className="flex min-h-14 items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 text-sm text-amber-200 hover:border-amber-400"
    >
      <BellRing className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className="block font-semibold">
          {count === 1
            ? "1 pedido aguardando confirmacao"
            : `${count} pedidos aguardando confirmacao`}
        </span>
        <span className="block text-xs text-amber-200/80">
          Toque para confirmar ou recusar.
        </span>
      </span>
    </Link>
  );
}
