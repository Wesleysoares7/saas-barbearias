import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";

import { PeriodPicker } from "@/components/painel/financeiro/period-picker";
import { ListRow } from "@/components/painel/ui/list-row";
import { PageHeader } from "@/components/painel/ui/page-header";
import { Pagination, parsePageParam } from "@/components/painel/ui/pagination";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import {
  endOfDayIso,
  formatDateBR,
  isDateInputValue,
  monthStartInputValue,
  startOfDayIso,
  todayInputValue,
} from "@/lib/datetime";

const PAGE_SIZE = 20;

type SearchParams = {
  start?: string;
  end?: string;
  pagina?: string;
};

type PaymentRow = {
  id: string;
  created_at: string;
  valor: number;
  percentual_comissao: number | null;
  valor_comissao: number | null;
  appointments:
    | { cliente_nome: string; service_id: string }
    | Array<{ cliente_nome: string; service_id: string }>
    | null;
};

type TotalRow = {
  valor: number;
  valor_comissao: number | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizeDate(value: string | undefined, fallback: string): string {
  return value && isDateInputValue(value) ? value : fallback;
}

export default async function MinhaComissaoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { supabase, companyId, role, redirectTo, employeeId, employeeCommissionPercent } =
    await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!employeeId || !canAccessModule(role, "minha_comissao", employeeId)) {
    redirect("/painel");
  }

  const resolved = (await searchParams) ?? {};
  const start = normalizeDate(resolved.start, monthStartInputValue());
  const end = normalizeDate(resolved.end, todayInputValue());
  const startIso = startOfDayIso(start);
  const endIso = endOfDayIso(end);
  const page = parsePageParam(resolved.pagina);
  const from = (page - 1) * PAGE_SIZE;

  const [pageResponse, totalsResponse, scheduledResponse] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, created_at, valor, percentual_comissao, valor_comissao, appointments!inner(employee_id, cliente_nome, service_id)",
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .eq("appointments.employee_id", employeeId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("payments")
      .select("valor, valor_comissao, appointments!inner(employee_id)")
      .eq("company_id", companyId)
      .eq("appointments.employee_id", employeeId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(5000),
    supabase
      .from("appointments")
      .select("service_id")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .eq("status", "agendado")
      .gte("data_hora", startIso)
      .lte("data_hora", endIso)
      .limit(5000),
  ]);

  const payments = (pageResponse.data ?? []) as unknown as PaymentRow[];
  const total = pageResponse.count ?? 0;
  const totals = (totalsResponse.data ?? []) as unknown as TotalRow[];
  const scheduled = (scheduledResponse.data ?? []) as Array<{ service_id: string }>;

  const serviceIds = [
    ...new Set([
      ...scheduled.map((item) => item.service_id),
      ...payments.flatMap((payment) => {
        const appt = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments;

        return appt ? [appt.service_id] : [];
      }),
    ]),
  ];

  const { data: servicesData } =
    serviceIds.length > 0
      ? await supabase
          .from("services")
          .select("id, nome, valor")
          .eq("company_id", companyId)
          .in("id", serviceIds)
      : { data: [] as Array<{ id: string; nome: string; valor: number }> };

  const services = new Map(
    ((servicesData ?? []) as Array<{ id: string; nome: string; valor: number }>).map((service) => [
      service.id,
      service,
    ]),
  );

  const commissionTotal = totals.reduce((sum, row) => sum + Number(row.valor_comissao ?? 0), 0);
  const servicesTotal = totals.reduce((sum, row) => sum + Number(row.valor ?? 0), 0);
  const forecast =
    employeeCommissionPercent === null
      ? null
      : scheduled.reduce((sum, item) => sum + Number(services.get(item.service_id)?.valor ?? 0), 0) *
        (employeeCommissionPercent / 100);

  return (
    <div className="space-y-5 pb-24">
      <PageHeader icon={Wallet} title="Minha comissao" description="Acompanhe a comissao dos seus atendimentos." />

      <PeriodPicker start={start} end={end} basePath="/painel/minha-comissao" />

      {employeeCommissionPercent === null ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
          Sua comissao ainda nao foi configurada. Fale com o administrador.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Comissao no periodo"
          value={formatCurrency(commissionTotal)}
          icon={Wallet}
          tone="success"
        />
        <StatCard label="Atendimentos concluidos" value={totals.length} icon={Wallet} />
        <StatCard label="Total dos servicos" value={formatCurrency(servicesTotal)} icon={Wallet} />
      </div>

      {forecast !== null ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          Previsto (agendados no periodo): <span className="font-medium text-foreground">{formatCurrency(forecast)}</span>{" "}
          (estimativa)
        </p>
      ) : null}

      <Panel title="Pagamentos do periodo">
        {payments.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
            Nenhum atendimento concluido neste periodo.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const appt = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments;
              const serviceName = appt ? (services.get(appt.service_id)?.nome ?? "Servico") : "Servico";
              const percent = Number(payment.percentual_comissao ?? 0);

              return (
                <ListRow
                  key={payment.id}
                  title={`${serviceName} - ${appt?.cliente_nome ?? "Cliente"}`}
                  subtitle={`${formatDateBR(payment.created_at)} · ${formatCurrency(Number(payment.valor))} · ${percent}%`}
                  columns={[
                    { label: "Valor", value: formatCurrency(Number(payment.valor)) },
                    { label: "Percentual", value: `${percent}%` },
                  ]}
                  hideSubtitleOnDesktop={false}
                  actions={
                    <span className="text-sm font-semibold text-brand">
                      {formatCurrency(Number(payment.valor_comissao ?? 0))}
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/painel/minha-comissao"
          params={{ start, end }}
        />
      </Panel>
    </div>
  );
}