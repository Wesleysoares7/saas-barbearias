import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/painel/ui/page-header";
import { CalendarClock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateAppointmentForm } from "@/components/painel/agendamentos/create-appointment-form";
import { AppointmentItemForm } from "@/components/painel/agendamentos/appointment-item-form";
import { QuickAppointmentDialog } from "@/components/painel/agendamentos/quick-appointment-dialog";
import {
  canAccessModule,
  canPerformAction,
  getAccessContext,
} from "@/lib/auth/access";
import type { AppointmentStatus } from "@/types";
import { CompletedAppointmentItem } from "@/components/painel/agendamentos/completed-appointment-item";
import { ListRow } from "@/components/painel/ui/list-row";
import { Pagination, parsePageParam, sanitizeSearchTerm } from "@/components/painel/ui/pagination";
import { StatusPill } from "@/components/painel/ui/status-pill";
import {
  AppointmentsFilters,
  type AppointmentPeriod,
} from "@/components/painel/agendamentos/appointments-filters";
import {
  addDaysToInput,
  formatDateBR,
  formatDateTimeBR,
  isoToLocalInputValue,
  todayInputValue,
} from "@/lib/datetime";

const COMPLETED_PAGE_SIZE = 20;
const PERIODS: AppointmentPeriod[] = ["hoje", "ontem", "semana", "todos"];

function parsePeriod(value: string | undefined, hasTerm: boolean): AppointmentPeriod {
  const found = PERIODS.find((period) => period === value);

  return found ?? (hasTerm ? "todos" : "hoje");
}

function getPeriodRange(periodo: AppointmentPeriod, today: string): { from: string; to: string } | null {
  if (periodo === "todos") {
    return null;
  }

  if (periodo === "hoje") {
    return { from: today, to: today };
  }

  if (periodo === "ontem") {
    const yesterday = addDaysToInput(today, -1);

    return { from: yesterday, to: yesterday };
  }

  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = addDaysToInput(today, -((weekday + 6) % 7));

  return { from: monday, to: addDaysToInput(monday, 6) };
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type VoidedAppointmentRow = {
  id: string;
  cliente_nome: string;
  employee_id: string;
  service_id: string;
  data_hora: string;
  valor_estornado: number | null;
  excluido_em: string | null;
  excluido_por: string | null;
  motivo_exclusao: string | null;
};

function isVoidedStatus(status: string): boolean {
  return status === "excluido";
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function addDays(dayKey: string, amount: number): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function formatDayHeading(dayKey: string, today: string): string {
  const [year, month, day] = dayKey.split("-");
  const date = new Date(`${dayKey}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
  const base = `${weekday}, ${day}/${month}`;

  if (!year) {
    return base;
  }

  if (dayKey === today) {
    return `Hoje - ${base}`;
  }

  if (dayKey === addDays(today, 1)) {
    return `Amanha - ${base}`;
  }

  return base;
}

function groupByDay<T extends { data_hora: string }>(rows: T[]): Array<{ day: string; rows: T[] }> {
  const groups: Array<{ day: string; rows: T[] }> = [];

  for (const row of rows) {
    const day = isoToLocalInputValue(row.data_hora).slice(0, 10);
    const last = groups[groups.length - 1];

    if (last && last.day === day) {
      last.rows.push(row);
    } else {
      groups.push({ day, rows: [row] });
    }
  }

  return groups;
}

type OptionItem = {
  id: string;
  nome: string;
  duracao?: number;
  valor?: number;
  telefone?: string | null;
};

type AppointmentRow = {
  id: string;
  customer_id: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  employee_id: string;
  service_id: string;
  data_hora: string;
  data_hora_fim: string | null;
  status: AppointmentStatus;
  observacoes: string | null;
};

type AppointmentSlot = {
  id: string;
  employeeId: string;
  startIso: string;
  endIso: string;
  status: AppointmentStatus;
};

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; periodo?: string; pagina?: string }>;
}) {
  const { supabase, companyId, role, redirectTo, employeeId } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "agendamentos")) {
    redirect("/painel");
  }

  const query = await searchParams;
  const term = sanitizeSearchTerm(query.q);
  const periodo = parsePeriod(query.periodo, Boolean(term));
  const requestedPage = parsePageParam(query.pagina);

  const canCreateAppointment = canPerformAction(role, "agendamentos", "create");
  const canUpdateAppointment = canPerformAction(role, "agendamentos", "update");
  const canDeleteAppointment = canPerformAction(role, "agendamentos", "delete");
  const canCompleteAndCharge = canPerformAction(role, "financeiro", "create");

  const ownEmployeeId = role === "employee" ? employeeId : null;

  let employeesQuery = supabase
    .from("employees")
    .select("id, nome")
    .eq("company_id", companyId)
    .eq("ativo", true);
  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      "id, customer_id, cliente_nome, cliente_telefone, employee_id, service_id, data_hora, data_hora_fim, status, observacoes",
    )
    .eq("company_id", companyId)
    .neq("status", "excluido");

  if (ownEmployeeId) {
    employeesQuery = employeesQuery.eq("id", ownEmployeeId);
    appointmentsQuery = appointmentsQuery.eq("employee_id", ownEmployeeId);
  }

  const [
    employeesResponse,
    servicesResponse,
    customersResponse,
    appointmentsResponse,
  ] = await Promise.all([
    employeesQuery.order("nome", { ascending: true }),
    supabase
      .from("services")
      .select("id, nome, duracao, valor")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("customers")
      .select("id, nome, telefone")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(1000),
    appointmentsQuery.order("data_hora", { ascending: true }),
  ]);

  const employees: OptionItem[] = (employeesResponse.data ??
    []) as OptionItem[];
  const services: OptionItem[] = (servicesResponse.data ?? []) as OptionItem[];
  const customers: OptionItem[] = (customersResponse.data ??
    []) as OptionItem[];

  const appointments: AppointmentRow[] = (appointmentsResponse.data ??
    []) as AppointmentRow[];
  const appointmentSlots: AppointmentSlot[] = appointments.map(
    (appointment) => ({
      id: appointment.id,
      employeeId: appointment.employee_id,
      startIso: appointment.data_hora,
      endIso: appointment.data_hora_fim ?? appointment.data_hora,
      status: appointment.status,
    }),
  );

  const today = todayInputValue();
  const range = getPeriodRange(periodo, today);
  const normalizedTerm = normalizeText(term);
  const termDigits = term.replace(/\D/g, "");

  const matchesFilters = (row: {
    cliente_nome: string;
    cliente_telefone?: string | null;
    employee_id: string;
    service_id: string;
    data_hora: string;
  }): boolean => {
    if (range) {
      const day = isoToLocalInputValue(row.data_hora).slice(0, 10);

      if (day < range.from || day > range.to) {
        return false;
      }
    }

    if (!normalizedTerm) {
      return true;
    }

    const phone = row.cliente_telefone ?? "";
    const serviceName = services.find((service) => service.id === row.service_id)?.nome ?? "";
    const employeeName = employees.find((employee) => employee.id === row.employee_id)?.nome ?? "";
    const textMatch = [row.cliente_nome, phone, serviceName, employeeName].some((value) =>
      normalizeText(value).includes(normalizedTerm),
    );

    return textMatch || (termDigits.length > 0 && phone.replace(/\D/g, "").includes(termDigits));
  };

  // Separar agendamentos concluídos dos pendentes
  const pendingAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== "concluido" && !isVoidedStatus(appointment.status) && matchesFilters(appointment),
  );
  const filteredCompleted = appointments
    .filter((appointment) => appointment.status === "concluido" && matchesFilters(appointment))
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora));

  const completedTotal = filteredCompleted.length;
  const completedTotalPages = Math.max(1, Math.ceil(completedTotal / COMPLETED_PAGE_SIZE));
  const page = Math.min(requestedPage, completedTotalPages);
  const completedAppointments = filteredCompleted.slice(
    (page - 1) * COMPLETED_PAGE_SIZE,
    page * COMPLETED_PAGE_SIZE,
  );

  const pendingGroups = groupByDay(pendingAppointments);
  const completedGroups = groupByDay(completedAppointments);

  let voidedAppointments: VoidedAppointmentRow[] = [];
  const excluidoPorNomes = new Map<string, string>();

  if (role === "admin") {
    const since = daysAgoIso(90);
    const { data: voidedData } = await supabase
      .from("appointments")
      .select(
        "id, cliente_nome, employee_id, service_id, data_hora, valor_estornado, excluido_em, excluido_por, motivo_exclusao",
      )
      .eq("company_id", companyId)
      .eq("status", "excluido")
      .gte("excluido_em", since)
      .order("excluido_em", { ascending: false });

    voidedAppointments = ((voidedData ?? []) as VoidedAppointmentRow[]).filter(matchesFilters);

    const actorIds = Array.from(
      new Set(voidedAppointments.map((row) => row.excluido_por).filter((value): value is string => Boolean(value))),
    );

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("company_id", companyId)
        .in("id", actorIds);

      for (const actor of (actors ?? []) as Array<{ id: string; nome: string | null; email: string | null }>) {
        excluidoPorNomes.set(actor.id, actor.nome?.trim() || actor.email || "-");
      }
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarClock}
        title="Agendamentos"
        description="Gerencie os agendamentos vinculados aos funcionarios e servicos da sua empresa."
        actions={
          <>
            {canCreateAppointment &&
              canCompleteAndCharge &&
              employees.length > 0 &&
              services.length > 0 && (
                <QuickAppointmentDialog employees={employees} services={services} customers={customers} />
              )}
            {canCreateAppointment &&
              employees.length > 0 &&
              services.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="h-11 bg-amber-400 text-zinc-950 hover:bg-amber-300">
                      <Plus className="size-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Novo Agendamento</DialogTitle>
                    </DialogHeader>
                    <CreateAppointmentForm
                      employees={employees}
                      services={services}
                      customers={customers}
                      appointmentSlots={appointmentSlots}
                    />
                  </DialogContent>
                </Dialog>
              )}
          </>
        }
      />

      {employees.length === 0 || services.length === 0 ? (
        <div className="space-y-2">
          {services.length === 0 ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
              {role === "admin" ? (
                <>
                  Cadastre pelo menos um servico ativo para criar agendamentos.{" "}
                  <Link href="/painel/servicos" className="font-medium underline">
                    Ir para Servicos
                  </Link>
                </>
              ) : (
                "Cadastre pelo menos um servico ativo para criar agendamentos. Peca ao administrador."
              )}
            </p>
          ) : null}
          {employees.length === 0 ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
              {role === "admin" ? (
                <>
                  Cadastre pelo menos um funcionario ativo (voce pode se cadastrar como funcionario).{" "}
                  <Link href="/painel/funcionarios" className="font-medium underline">
                    Ir para Funcionarios
                  </Link>
                </>
              ) : (
                "Cadastre pelo menos um funcionario ativo. Peca ao administrador."
              )}
            </p>
          ) : null}
        </div>
      ) : !canCreateAppointment ? (
        <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
          Seu perfil pode visualizar e atualizar agendamentos, mas nao pode
          criar novos.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-100">
            Lista de agendamentos
          </h2>
        </div>

        <AppointmentsFilters term={term} periodo={periodo} />

        {appointments.length > 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            {pendingAppointments.length} pendentes · {completedTotal} concluidos
            {role === "admin" ? ` · ${voidedAppointments.length} excluidos` : ""}
          </p>
        ) : null}

        {appointments.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
            Nenhum agendamento cadastrado ainda.
          </p>
        ) : pendingAppointments.length === 0 && completedTotal === 0 && voidedAppointments.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
            Nenhum atendimento encontrado para este filtro.{" "}
            <Link href="/painel/agendamentos?periodo=todos" className="font-medium underline">
              Ver todos
            </Link>
          </p>
        ) : (
          <div className="space-y-5">
            {pendingGroups.map((group) => (
              <section key={group.day} className="space-y-2">
                <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {formatDayHeading(group.day, today)}
                </h3>
                {group.rows.map((appointment) => (
                  <AppointmentItemForm
                    key={appointment.id}
                    appointment={appointment}
                    employees={employees}
                    services={services}
                    customers={customers}
                    appointmentSlots={appointmentSlots}
                    canUpdate={canUpdateAppointment}
                    canDelete={canDeleteAppointment}
                    canCompleteAndCharge={canCompleteAndCharge}
                  />
                ))}
              </section>
            ))}

            {completedAppointments.length > 0 && (
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground">Agendamentos Concluidos</h3>
                {completedGroups.map((group) => (
                  <section key={group.day} className="space-y-2">
                    <h4 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {formatDayHeading(group.day, today)}
                    </h4>
                    {group.rows.map((appointment) => (
                      <CompletedAppointmentItem
                        key={appointment.id}
                        appointment={appointment}
                        servicoNome={services.find((service) => service.id === appointment.service_id)?.nome}
                        funcionarioNome={employees.find((employee) => employee.id === appointment.employee_id)?.nome}
                        canDelete={role === "admin"}
                      />
                    ))}
                  </section>
                ))}
                <Pagination
                  page={page}
                  pageSize={COMPLETED_PAGE_SIZE}
                  total={completedTotal}
                  basePath="/painel/agendamentos"
                  params={{ q: term, periodo }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {role === "admin" && voidedAppointments.length > 0 && (
        <div className="space-y-3 border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground">Agendamentos Excluidos</h3>
          <p className="px-1 text-xs text-muted-foreground">Ultimos 90 dias.</p>
          {voidedAppointments.map((row) => {
            const valor = row.valor_estornado;
            const servicoNome = services.find((service) => service.id === row.service_id)?.nome ?? "Servico";
            const funcionarioNome = employees.find((employee) => employee.id === row.employee_id)?.nome ?? "Funcionario";

            return (
              <ListRow
                key={row.id}
                time={isoToLocalInputValue(row.data_hora).slice(11, 16)}
                title={row.cliente_nome}
                subtitle={`${servicoNome} - ${funcionarioNome} - ${formatDateBR(row.data_hora)}`}
                columns={[
                  {
                    label: "Valor estornado",
                    value: typeof valor === "number" ? currencyFormatter.format(valor) : "-",
                  },
                  { label: "Excluido em", value: formatDateTimeBR(row.excluido_em) },
                  {
                    label: "Excluido por",
                    value: row.excluido_por ? (excluidoPorNomes.get(row.excluido_por) ?? "-") : "-",
                  },
                  { label: "Motivo", value: row.motivo_exclusao?.trim() || "-" },
                ]}
                status={<StatusPill tone="danger">Excluido</StatusPill>}
                actions={null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}