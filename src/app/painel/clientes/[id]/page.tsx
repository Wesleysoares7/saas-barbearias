import Link from "next/link";
import { redirect } from "next/navigation";

import { canAccessModule, getAccessContext } from "@/lib/auth/access";
import type { AppointmentStatus, CustomerRow } from "@/types";

type AppointmentRow = {
  id: string;
  data_hora: string;
  status: AppointmentStatus;
  service_id: string;
  employee_id: string;
  observacoes: string | null;
};

type ServiceRow = {
  id: string;
  nome: string;
};

type EmployeeRow = {
  id: string;
  nome: string;
};

type PaymentRow = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: string;
  percentual_comissao: number;
  valor_comissao: number;
  created_at: string;
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

export default async function CustomerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "clientes")) {
    redirect("/painel");
  }

  const customerResponse = await supabase
    .from("customers")
    .select("id, nome, telefone, email, observacoes, ativo")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();

  const hasCustomerTableIssue = Boolean(customerResponse.error?.message.includes("customers"));
  const customer = (customerResponse.data ?? null) as CustomerRow | null;

  if (!hasCustomerTableIssue && !customer) {
    redirect("/painel/clientes");
  }

  const appointmentsResponse = customer
    ? await supabase
        .from("appointments")
        .select("id, data_hora, status, service_id, employee_id, observacoes")
        .eq("company_id", companyId)
        .eq("customer_id", customer.id)
        .order("data_hora", { ascending: false })
        .limit(200)
    : { data: [] as AppointmentRow[], error: null };

  const appointments = (appointmentsResponse.data ?? []) as AppointmentRow[];

  const [servicesResponse, employeesResponse] = await Promise.all([
    supabase.from("services").select("id, nome").eq("company_id", companyId),
    supabase.from("employees").select("id, nome").eq("company_id", companyId),
  ]);

  const services = (servicesResponse.data ?? []) as ServiceRow[];
  const employees = (employeesResponse.data ?? []) as EmployeeRow[];

  const serviceNameById = new Map(services.map((service) => [service.id, service.nome]));
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.nome]));

  const appointmentIds = appointments.map((appointment) => appointment.id);
  const paymentsResponse =
    appointmentIds.length > 0
      ? await supabase
          .from("payments")
          .select("id, appointment_id, valor, forma_pagamento, percentual_comissao, valor_comissao, created_at")
          .eq("company_id", companyId)
          .in("appointment_id", appointmentIds)
      : { data: [] as PaymentRow[], error: null };

  const payments = (paymentsResponse.data ?? []) as PaymentRow[];
  const paymentByAppointmentId = new Map(payments.map((payment) => [payment.appointment_id, payment]));

  const totalAppointments = appointments.length;
  const totalConcluded = appointments.filter((appointment) => appointment.status === "concluido").length;
  const totalCanceled = appointments.filter((appointment) => appointment.status === "cancelado").length;
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0);

  return (
    <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Historico do cliente</h1>
            <p className="text-sm text-zinc-300">Acompanhe atendimentos e pagamentos vinculados ao cliente selecionado.</p>
          </div>

          <Link
            href="/painel/clientes"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition hover:border-amber-400 hover:text-amber-300"
          >
            Voltar para clientes
          </Link>
        </header>

        {hasCustomerTableIssue ? (
          <div className="rounded-lg border border-rose-500/35 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
            Seu banco ainda nao foi atualizado para clientes. Execute os scripts docs/database/005_etapa13_clientes.sql e docs/database/006_etapa13_agendamentos_clientes.sql no Supabase SQL Editor.
          </div>
        ) : null}

        {customer ? (
          <div className="grid gap-3 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-400">Cliente</p>
              <p className="text-sm font-medium text-zinc-100">{customer.nome}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Telefone</p>
              <p className="text-sm font-medium text-zinc-100">{customer.telefone || "Nao informado"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">E-mail</p>
              <p className="text-sm font-medium text-zinc-100">{customer.email || "Nao informado"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Status</p>
              <p className="text-sm font-medium text-zinc-100">{customer.ativo ? "Ativo" : "Inativo"}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/60 p-4">
            <p className="text-xs text-zinc-400">Atendimentos (total)</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{totalAppointments}</p>
          </article>
          <article className="rounded-lg border border-emerald-500/35 bg-emerald-600/10 p-4">
            <p className="text-xs text-emerald-200/80">Concluidos</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">{totalConcluded}</p>
          </article>
          <article className="rounded-lg border border-rose-500/35 bg-rose-600/10 p-4">
            <p className="text-xs text-rose-200/80">Cancelados</p>
            <p className="mt-1 text-2xl font-semibold text-rose-100">{totalCanceled}</p>
          </article>
          <article className="rounded-lg border border-sky-500/35 bg-sky-600/10 p-4">
            <p className="text-xs text-sky-200/80">Faturamento pago</p>
            <p className="mt-1 text-2xl font-semibold text-sky-100">{formatCurrency(totalPaid)}</p>
          </article>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Linha do tempo de atendimentos</h2>

          {appointments.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
              Nenhum atendimento vinculado a este cliente ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const payment = paymentByAppointmentId.get(appointment.id);
                const serviceName = serviceNameById.get(appointment.service_id) ?? "Servico removido";
                const employeeName = employeeNameById.get(appointment.employee_id) ?? "Funcionario removido";

                return (
                  <article key={appointment.id} className="rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-100">{formatDateTime(appointment.data_hora)}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getStatusBadge(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                      <p>
                        <span className="text-zinc-500">Servico:</span> {serviceName}
                      </p>
                      <p>
                        <span className="text-zinc-500">Funcionario:</span> {employeeName}
                      </p>
                      <p>
                        <span className="text-zinc-500">Pagamento:</span> {payment ? formatCurrency(Number(payment.valor ?? 0)) : "Nao registrado"}
                      </p>
                      <p>
                        <span className="text-zinc-500">Forma:</span> {payment?.forma_pagamento ?? "-"}
                      </p>
                    </div>

                    {appointment.observacoes ? (
                      <p className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
                        {appointment.observacoes}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
