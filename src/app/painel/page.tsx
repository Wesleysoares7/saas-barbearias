import Link from "next/link";
import { redirect } from "next/navigation";

import { getAccessContext } from "@/lib/auth/access";
import { endOfDayIso, formatDateTimeBR, monthEndInputValue, monthStartInputValue, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { CalendarClock, CheckCircle2, Clock, LayoutDashboard, Wallet, XCircle } from "lucide-react";

import { PageHeader } from "@/components/painel/ui/page-header";
import { Panel } from "@/components/painel/ui/panel";
import { StatCard } from "@/components/painel/ui/stat-card";
import { StatusPill } from "@/components/painel/ui/status-pill";
import type { AppointmentStatus } from "@/types";

type AppointmentRow = {
  id: string;
  cliente_nome: string;
  data_hora: string;
  status: AppointmentStatus;
  service_id?: string;
};

type PaymentRow = {
  valor: number;
};

type ServiceRow = {
  id: string;
  nome: string;
};

function formatDateTime(value: string): string {
  const formatted = formatDateTimeBR(value);

  return formatted === "-" ? value : formatted;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function getStatusBadge(status: AppointmentStatus): string {
  if (status === "concluido") {
    return "border-emerald-500/40 bg-emerald-600/10 text-emerald-200";
  }

  if (status === "cancelado") {
    return "border-rose-500/40 bg-rose-600/10 text-rose-200";
  }

  return "border-amber-500/40 bg-amber-600/10 text-amber-200";
}

function getStatusLabel(status: AppointmentStatus): string {
  if (status === "concluido") {
    return "Concluido";
  }

  if (status === "cancelado") {
    return "Cancelado";
  }

  return "Agendado";
}

export default async function PainelPage() {
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  const now = new Date();
  const today = todayInputValue(now);
  const startOfDay = startOfDayIso(today);
  const endOfDay = endOfDayIso(today);
  const startOfMonth = startOfDayIso(monthStartInputValue(now));
  const endOfMonth = endOfDayIso(monthEndInputValue(now));

  const [todayAppointmentsResponse, paymentsTodayResponse, servicesResponse, concludedMonthResponse] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, cliente_nome, data_hora, status")
      .eq("company_id", companyId)
      .gte("data_hora", startOfDay)
      .lte("data_hora", endOfDay)
      .order("data_hora", { ascending: true }),
    supabase
      .from("payments")
      .select("valor")
      .eq("company_id", companyId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay),
    supabase.from("services").select("id, nome").eq("company_id", companyId),
    supabase
      .from("appointments")
      .select("service_id")
      .eq("company_id", companyId)
      .eq("status", "concluido")
      .gte("data_hora", startOfMonth)
      .lte("data_hora", endOfMonth),
  ]);

  const todayAppointments = (todayAppointmentsResponse.data ?? []) as AppointmentRow[];
  const todayPayments = (paymentsTodayResponse.data ?? []) as PaymentRow[];
  const services = (servicesResponse.data ?? []) as ServiceRow[];
  const concludedAppointmentsThisMonth = (concludedMonthResponse.data ?? []) as AppointmentRow[];

  const totalToday = todayAppointments.length;
  const totalScheduled = todayAppointments.filter((item) => item.status === "agendado").length;
  const totalConcluded = todayAppointments.filter((item) => item.status === "concluido").length;
  const totalCanceled = todayAppointments.filter((item) => item.status === "cancelado").length;
  const revenueToday = roundToTwo(todayPayments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0));
  const nextAppointments = todayAppointments.filter(
    (item) => item.status === "agendado" && new Date(item.data_hora).getTime() >= now.getTime(),
  );

  const serviceNameById = new Map(services.map((service) => [service.id, service.nome]));
  const serviceCountById = new Map<string, number>();

  for (const appointment of concludedAppointmentsThisMonth) {
    const serviceId = String(appointment.service_id ?? "");

    if (!serviceId) {
      continue;
    }

    serviceCountById.set(serviceId, (serviceCountById.get(serviceId) ?? 0) + 1);
  }

  const topServices = [...serviceCountById.entries()]
    .map(([serviceId, total]) => ({
      serviceId,
      serviceName: serviceNameById.get(serviceId) ?? "Servico removido",
      total,
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);

  let onboardingSteps: { label: string; href: string; done: boolean }[] = [];

  if (role === "admin") {
    const [servicesCount, employeesCount, appointmentsCount] = await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("ativo", true),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("ativo", true),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]);

    onboardingSteps = [
      { label: "Cadastrar um servico", href: "/painel/servicos", done: (servicesCount.count ?? 0) > 0 },
      { label: "Ter um funcionario ativo, incluindo voce", href: "/painel/funcionarios", done: (employeesCount.count ?? 0) > 0 },
      { label: "Criar o primeiro agendamento", href: "/painel/agendamentos", done: (appointmentsCount.count ?? 0) > 0 },
    ];
  }

  const showOnboarding = onboardingSteps.length > 0 && onboardingSteps.some((step) => !step.done);

  return (
    <div className="space-y-5">
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Visao rapida da agenda do dia." />

      {showOnboarding ? (
        <Panel title="Primeiros passos">
          <ul className="space-y-2">
            {onboardingSteps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 text-sm text-foreground hover:border-brand"
                >
                  <span className="min-w-0 truncate">{step.label}</span>
                  <StatusPill tone={step.done ? "success" : "warning"}>{step.done ? "Feito" : "Pendente"}</StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Agendamentos hoje" value={totalToday} icon={CalendarClock} />
        <StatCard className="col-span-2 sm:col-span-1" label="Faturamento hoje" value={formatCurrency(revenueToday)} icon={Wallet} tone="success" />
        <StatCard label="Agendados" value={totalScheduled} icon={Clock} tone="warning" />
        <StatCard label="Concluidos" value={totalConcluded} icon={CheckCircle2} tone="success" />
        <StatCard label="Cancelados" value={totalCanceled} icon={XCircle} tone="danger" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Proximos atendimentos de hoje</h2>
            <p className="text-xs text-muted-foreground">{nextAppointments.length} pendente(s)</p>
          </div>

          {nextAppointments.length === 0 ? (
            <p className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
              Nenhum agendamento pendente para hoje.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {nextAppointments.slice(0, 6).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-foreground">{appointment.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(appointment.data_hora)}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getStatusBadge(appointment.status)}`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="text-sm font-semibold text-foreground">Servicos mais vendidos (mes)</h2>

          {topServices.length === 0 ? (
            <p className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
              Sem servicos concluidos no mes atual.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {topServices.map((service, index) => (
                <div
                  key={service.serviceId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2"
                >
                  <p className="text-sm text-foreground">
                    {index + 1}. {service.serviceName}
                  </p>
                  <span className="rounded-full border border-amber-500/40 bg-amber-600/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                    {service.total}
                  </span>
                </div>
              ))}
            </div>
          )}

        </Panel>
      </div>
    </div>
  );
}
