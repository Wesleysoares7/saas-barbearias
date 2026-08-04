import { redirect } from "next/navigation";
import Link from "next/link";

import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import { signOutAction } from "@/app/painel/actions";

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("nome")
    .eq("id", companyId)
    .maybeSingle();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [todayAppointmentsResponse, paymentsTodayResponse, servicesResponse, concludedMonthResponse] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, cliente_nome, data_hora, status")
      .eq("company_id", companyId)
      .gte("data_hora", startOfDay.toISOString())
      .lte("data_hora", endOfDay.toISOString())
      .order("data_hora", { ascending: true }),
    supabase
      .from("payments")
      .select("valor")
      .eq("company_id", companyId)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString()),
    supabase.from("services").select("id, nome").eq("company_id", companyId),
    supabase
      .from("appointments")
      .select("service_id")
      .eq("company_id", companyId)
      .eq("status", "concluido")
      .gte("data_hora", startOfMonth.toISOString())
      .lte("data_hora", endOfMonth.toISOString()),
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />

      <section className="relative z-10 mx-auto w-full max-w-6xl rounded-2xl border border-amber-400/20 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-300">Visao rapida da agenda do dia e acesso aos modulos.</p>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-rose-400 hover:text-rose-300"
            >
              Sair
            </button>
          </form>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-4">
            <p className="text-xs text-zinc-400">Agendamentos hoje</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{totalToday}</p>
          </article>

          <article className="rounded-lg border border-sky-500/35 bg-sky-600/10 p-4">
            <p className="text-xs text-sky-200/80">Faturamento hoje</p>
            <p className="mt-1 text-2xl font-semibold text-sky-100">{formatCurrency(revenueToday)}</p>
          </article>

          <article className="rounded-lg border border-amber-500/35 bg-amber-600/10 p-4">
            <p className="text-xs text-amber-200/80">Agendados</p>
            <p className="mt-1 text-2xl font-semibold text-amber-100">{totalScheduled}</p>
          </article>

          <article className="rounded-lg border border-emerald-500/35 bg-emerald-600/10 p-4">
            <p className="text-xs text-emerald-200/80">Concluidos</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">{totalConcluded}</p>
          </article>

          <article className="rounded-lg border border-rose-500/35 bg-rose-600/10 p-4">
            <p className="text-xs text-rose-200/80">Cancelados</p>
            <p className="mt-1 text-2xl font-semibold text-rose-100">{totalCanceled}</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-100">Proximos atendimentos de hoje</h2>
              <p className="text-xs text-zinc-400">{nextAppointments.length} pendente(s)</p>
            </div>

            {nextAppointments.length === 0 ? (
              <p className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
                Nenhum agendamento pendente para hoje.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {nextAppointments.slice(0, 6).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-zinc-100">{appointment.cliente_nome}</p>
                      <p className="text-xs text-zinc-400">{formatDateTime(appointment.data_hora)}</p>
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
          </article>

          <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Servicos mais vendidos (mes)</h2>

            {topServices.length === 0 ? (
              <p className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
                Sem servicos concluidos no mes atual.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {topServices.map((service, index) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2"
                  >
                    <p className="text-sm text-zinc-100">
                      {index + 1}. {service.serviceName}
                    </p>
                    <span className="rounded-full border border-amber-500/40 bg-amber-600/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                      {service.total}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-400">Empresa</p>
            <p className="mt-1 text-sm text-zinc-100">{company?.nome ?? "Empresa nao encontrada"}</p>

            <p className="mt-4 text-xs text-zinc-400">Usuario logado</p>
            <p className="mt-1 text-sm text-zinc-100">{user?.email ?? "Usuario sem e-mail"}</p>

            <p className="mt-4 text-xs text-zinc-400">Papel de acesso</p>
            <p className="mt-1 text-sm text-zinc-100">{role === "admin" ? "Administrador" : "Equipe"}</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {canAccessModule(role, "funcionarios") ? (
            <Link
              href="/painel/funcionarios"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Gerenciar funcionarios
            </Link>
          ) : null}
          {canAccessModule(role, "servicos") ? (
            <Link
              href="/painel/servicos"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Gerenciar servicos
            </Link>
          ) : null}
          {canAccessModule(role, "clientes") ? (
            <Link
              href="/painel/clientes"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Gerenciar clientes
            </Link>
          ) : null}
          <Link
            href="/painel/agendamentos"
            className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
          >
            Gerenciar agendamentos
          </Link>
          {canAccessModule(role, "financeiro") ? (
            <Link
              href="/painel/financeiro"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Gerenciar financeiro
            </Link>
          ) : null}
          {canAccessModule(role, "equipe") ? (
            <Link
              href="/painel/equipe"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Gerenciar equipe
            </Link>
          ) : null}
          <Link
            href="/painel/relatorios"
            className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
          >
            Relatorios e exportacao
          </Link>
          {canAccessModule(role, "auditoria") ? (
            <Link
              href="/painel/auditoria"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-sky-400 hover:text-sky-300"
            >
              Trilhas de auditoria
            </Link>
          ) : null}
          {canAccessModule(role, "notificacoes") ? (
            <Link
              href="/painel/notificacoes"
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-rose-400 hover:text-rose-300"
            >
              Notificacoes sensiveis
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
