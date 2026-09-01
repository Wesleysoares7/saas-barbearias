import { redirect } from "next/navigation";

import { CreatePaymentForm } from "@/components/painel/financeiro/create-payment-form";
import { PaymentItemForm } from "@/components/painel/financeiro/payment-item-form";
import { canAccessModule, getAccessContext } from "@/lib/auth/access";

type AppointmentRow = {
  id: string;
  cliente_nome: string;
  data_hora: string;
  status: "agendado" | "concluido" | "cancelado";
  service_id: string;
  employee_id: string;
};

type ServiceRow = {
  id: string;
  valor: number;
};

type EmployeeRow = {
  id: string;
  nome: string;
  percentual_comissao: number | null;
};

type PaymentRow = {
  id: string;
  appointment_id: string;
  created_at: string;
  valor: number;
  forma_pagamento: string;
  percentual_comissao: number;
  valor_comissao: number;
  appointments:
    | {
        cliente_nome: string;
        data_hora: string;
        employee_id: string;
      }
    | {
        cliente_nome: string;
        data_hora: string;
        employee_id: string;
      }[]
    | null;
};

type AppointmentOption = {
  id: string;
  clienteNome: string;
  dataHora: string;
  valorSugerido: number;
  percentualComissaoSugerido: number;
};

type EmployeeFinancialSummary = {
  id: string;
  nome: string;
  percentualComissao: number;
  quantidadePagamentos: number;
  faturamento: number;
  comissaoTotal: number;
};

type SearchParams = {
  start?: string;
  end?: string;
};

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function getPaymentAppointmentData(
  appointments: PaymentRow["appointments"],
): { clienteNome: string; dataHora: string } {
  const appointment = Array.isArray(appointments) ? appointments[0] : appointments;

  return {
    clienteNome: appointment?.cliente_nome ?? "Cliente nao encontrado",
    dataHora: appointment?.data_hora ?? "",
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string | undefined, fallback: string): string {
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultStart = toDateInputValue(startOfMonth);
  const defaultEnd = toDateInputValue(now);

  const start = normalizeDateInput(resolvedSearchParams.start, defaultStart);
  const end = normalizeDateInput(resolvedSearchParams.end, defaultEnd);

  const startDate = new Date(`${start}T00:00:00.000`);
  const endDate = new Date(`${end}T23:59:59.999`);

  const [appointmentsResponse, servicesResponse, employeesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, cliente_nome, data_hora, status, service_id, employee_id")
      .eq("company_id", companyId)
      .eq("status", "concluido")
      .order("data_hora", { ascending: false }),
    supabase.from("services").select("id, valor").eq("company_id", companyId),
    supabase.from("employees").select("id, nome, percentual_comissao").eq("company_id", companyId),
    supabase
      .from("payments")
      .select("id, appointment_id, created_at, valor, forma_pagamento, percentual_comissao, valor_comissao, appointments(cliente_nome, data_hora, employee_id)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  const appointments = (appointmentsResponse.data ?? []) as AppointmentRow[];
  const services = (servicesResponse.data ?? []) as ServiceRow[];
  const employees = (employeesResponse.data ?? []) as EmployeeRow[];
  const payments = (paymentsResponse.data ?? []) as PaymentRow[];

  const serviceValueById = new Map(services.map((service) => [service.id, Number(service.valor)]));
  const employeeCommissionById = new Map(
    employees.map((employee) => [employee.id, Number(employee.percentual_comissao ?? 0)]),
  );
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.nome]));
  const appointmentEmployeeById = new Map(appointments.map((appointment) => [appointment.id, appointment.employee_id]));

  const paidAppointmentIds = new Set(payments.map((payment) => payment.appointment_id));

  const filteredPayments = payments.filter((payment) => {
    const createdAt = new Date(payment.created_at);

    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }

    return createdAt >= startDate && createdAt <= endDate;
  });

  const employeeFinancialMap = new Map<string, EmployeeFinancialSummary>(
    employees.map((employee) => [
      employee.id,
      {
        id: employee.id,
        nome: employee.nome,
        percentualComissao: roundToTwo(Number(employee.percentual_comissao ?? 0)),
        quantidadePagamentos: 0,
        faturamento: 0,
        comissaoTotal: 0,
      },
    ]),
  );

  for (const payment of filteredPayments) {
    const appointmentEmployeeId = appointmentEmployeeById.get(payment.appointment_id);

    if (!appointmentEmployeeId) {
      continue;
    }

    const summary = employeeFinancialMap.get(appointmentEmployeeId);

    if (!summary) {
      employeeFinancialMap.set(appointmentEmployeeId, {
        id: appointmentEmployeeId,
        nome: employeeNameById.get(appointmentEmployeeId) ?? "Funcionario nao encontrado",
        percentualComissao: 0,
        quantidadePagamentos: 1,
        faturamento: Number(payment.valor),
        comissaoTotal: Number(payment.valor_comissao),
      });
      continue;
    }

    summary.quantidadePagamentos += 1;
    summary.faturamento += Number(payment.valor);
    summary.comissaoTotal += Number(payment.valor_comissao);
  }

  const employeeFinancialSummaries = [...employeeFinancialMap.values()]
    .map((summary) => ({
      ...summary,
      faturamento: roundToTwo(summary.faturamento),
      comissaoTotal: roundToTwo(summary.comissaoTotal),
    }))
    .sort((left, right) => right.comissaoTotal - left.comissaoTotal);

  const totalFaturamento = roundToTwo(payments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0));
  const totalComissao = roundToTwo(filteredPayments.reduce((sum, payment) => sum + Number(payment.valor_comissao ?? 0), 0));

  const availableAppointments: AppointmentOption[] = appointments
    .filter((appointment) => !paidAppointmentIds.has(appointment.id))
    .map((appointment) => {
      const valorSugerido = Number(serviceValueById.get(appointment.service_id) ?? 0);
      const percentualComissaoSugerido = Number(employeeCommissionById.get(appointment.employee_id) ?? 0);

      return {
        id: appointment.id,
        clienteNome: appointment.cliente_nome,
        dataHora: appointment.data_hora,
        valorSugerido: roundToTwo(valorSugerido),
        percentualComissaoSugerido: roundToTwo(percentualComissaoSugerido),
      };
    });

  const paymentItems = filteredPayments.map((payment) => {
    const appointmentData = getPaymentAppointmentData(payment.appointments);

    return {
      id: payment.id,
      appointmentId: payment.appointment_id,
      createdAt: payment.created_at,
      clienteNome: appointmentData.clienteNome,
      dataHora: appointmentData.dataHora,
      valor: Number(payment.valor),
      formaPagamento: payment.forma_pagamento,
      percentualComissao: Number(payment.percentual_comissao),
      valorComissao: Number(payment.valor_comissao),
    };
  });

  return (
    <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Financeiro</h1>
            <p className="text-sm text-zinc-300">Registre pagamentos, acompanhe o faturamento total e veja a comissao por funcionario.</p>
          </div>
        </header>

        <form className="grid gap-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="financeiro-start" className="text-sm text-zinc-200">
              Data inicial
            </label>
            <input
              id="financeiro-start"
              name="start"
              type="date"
              defaultValue={start}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="financeiro-end" className="text-sm text-zinc-200">
              Data final
            </label>
            <input
              id="financeiro-end"
              name="end"
              type="date"
              defaultValue={end}
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-10 rounded-lg border border-zinc-600 bg-zinc-900 px-4 text-sm font-medium text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              Atualizar periodo
            </button>
          </div>
        </form>

        {availableAppointments.length === 0 ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Nao ha agendamentos concluidos disponiveis para novo pagamento.
          </p>
        ) : (
          <CreatePaymentForm appointments={availableAppointments} />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="min-h-28 rounded-2xl border border-zinc-700/70 bg-zinc-950/60 p-5 shadow-lg shadow-black/10">
            <p className="text-xs text-zinc-400">Faturamento total</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{formatCurrency(totalFaturamento)}</p>
          </article>

          <article className="min-h-28 rounded-2xl border border-emerald-500/35 bg-emerald-600/10 p-5 shadow-lg shadow-emerald-950/20">
            <p className="text-xs text-emerald-200/80">Comissao total</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-100">{formatCurrency(totalComissao)}</p>
          </article>

          <article className="min-h-28 rounded-2xl border border-amber-500/35 bg-amber-600/10 p-5 shadow-lg shadow-amber-950/20">
            <p className="text-xs text-amber-200/80">Pagamentos registrados</p>
            <p className="mt-2 text-3xl font-semibold text-amber-100">{paymentItems.length}</p>
          </article>

          <article className="min-h-28 rounded-2xl border border-sky-500/35 bg-sky-600/10 p-5 shadow-lg shadow-sky-950/20">
            <p className="text-xs text-sky-200/80">Funcionarios com vendas</p>
            <p className="mt-2 text-3xl font-semibold text-sky-100">
              {employeeFinancialSummaries.filter((summary) => summary.quantidadePagamentos > 0).length}
            </p>
          </article>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-700/60 bg-zinc-950/60 p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Faturamento por funcionario</h2>
              <p className="text-sm text-zinc-400">Valores calculados com base nos pagamentos concluidos.</p>
            </div>
          </div>

          {employeeFinancialSummaries.length === 0 ? (
            <p className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 p-4 text-sm text-zinc-300">
              Nenhum funcionario cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {employeeFinancialSummaries.map((summary) => (
                <article key={summary.id} className="grid gap-3 rounded-xl border border-zinc-700/70 bg-zinc-900/80 p-5 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-zinc-400">Funcionario</p>
                    <p className="text-sm font-medium text-zinc-100">{summary.nome}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Faturamento</p>
                    <p className="text-sm text-zinc-100">{formatCurrency(summary.faturamento)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Comissao</p>
                    <p className="text-sm text-zinc-100">{formatCurrency(summary.comissaoTotal)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Pagamentos</p>
                    <p className="text-sm text-zinc-100">
                      {summary.quantidadePagamentos} | {summary.percentualComissao.toFixed(2)}%
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Lista de pagamentos</h2>

          {paymentItems.length === 0 ? (
            <p className="rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-4 text-sm text-zinc-300">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {paymentItems.map((payment) => (
                <PaymentItemForm key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
