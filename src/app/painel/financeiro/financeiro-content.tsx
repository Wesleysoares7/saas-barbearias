import { Panel } from "@/components/painel/ui/panel";
import { ListRow } from "@/components/painel/ui/list-row";
import { StatCard } from "@/components/painel/ui/stat-card";
import { CreatePaymentForm } from "@/components/painel/financeiro/create-payment-form";
import { PaymentItemForm } from "@/components/painel/financeiro/payment-item-form";
import { endOfDayIso, formatDateBR, startOfDayIso } from "@/lib/datetime";
import { CashEntryDialog } from "@/components/painel/financeiro/caixa/cash-entry-dialog";
import { CashEntryItem } from "@/components/painel/financeiro/caixa/cash-entry-item";
import { OpeningBalanceCard } from "@/components/painel/financeiro/caixa/opening-balance-card";
import { PAYMENT_METHODS, getPaymentMethodLabel } from "@/lib/payment-methods";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashEntry, FinanceSummary } from "@/types/cash";
import type {
  AppointmentRow,
  ServiceRow,
  EmployeeRow,
  PaymentRow,
  Tab,
  AppointmentOption,
  EmployeeFinancialSummary,
  PaymentMethodGroup,
  Indicator,
  StatementLine,
  FinanceByMethodRow,
} from "./types";

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getPaymentAppointmentData(appointments: PaymentRow["appointments"]): {
  clienteNome: string;
  dataHora: string;
} {
  const appointment = Array.isArray(appointments)
    ? appointments[0]
    : appointments;

  return {
    clienteNome: appointment?.cliente_nome ?? "Cliente nao encontrado",
    dataHora: appointment?.data_hora ?? "",
  };
}

const CARD_METHODS = new Set(["cartao_credito", "cartao_debito"]);
const MAIN_METHODS = [
  "pix",
  "dinheiro",
  "cartao_credito",
  "cartao_debito",
] as const;

type FinanceiroContentProps = {
  supabase: SupabaseClient;
  companyId: string;
  tab: Tab;
  start: string;
  end: string;
};

export async function FinanceiroContent({
  supabase,
  companyId,
  tab,
  start,
  end,
}: FinanceiroContentProps) {
  const startDate = new Date(startOfDayIso(start));
  const endDate = new Date(endOfDayIso(end));
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // ============ TAB: RESUMO ============
  if (tab === "resumo") {
    const [summaryResponse, paymentsResponse, financeByMethodResponse] =
      await Promise.all([
        supabase.rpc("finance_summary", {
          p_company_id: companyId,
          p_start: start,
          p_end: end,
        }),
        supabase
          .from("payments")
          .select(
            "valor, valor_comissao, forma_pagamento, valor_taxa, appointments(employee_id)",
          )
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso),
        supabase.rpc("finance_by_method", {
          p_company_id: companyId,
          p_start: start,
          p_end: end,
        }),
      ]);

    const summaryRows = (summaryResponse.data ?? []) as FinanceSummary[];
    const summary: FinanceSummary | null = summaryResponse.error
      ? null
      : (summaryRows[0] ?? null);
    const payments = (paymentsResponse.data ?? []) as PaymentRow[];
    const financeByMethodRows = (financeByMethodResponse.data ??
      []) as FinanceByMethodRow[];

    const financeByMethod = financeByMethodRows.map((row) => ({
      forma: row.forma,
      entradas: Number(row.entradas ?? 0),
      saidas: Number(row.saidas ?? 0),
      saldo: Number(row.saldo ?? 0),
    }));

    const totalFaturamento = roundToTwo(
      payments.reduce((sum, payment) => sum + Number(payment.valor ?? 0), 0),
    );
    const totalComissao = roundToTwo(
      payments.reduce(
        (sum, payment) => sum + Number(payment.valor_comissao ?? 0),
        0,
      ),
    );

    // Count distinct employee_id from joined appointments
    const distinctEmployeeIds = new Set<string>();
    for (const payment of payments) {
      const appointments = payment.appointments;
      if (appointments) {
        const appointment = Array.isArray(appointments)
          ? appointments[0]
          : appointments;
        if (appointment?.employee_id) {
          distinctEmployeeIds.add(appointment.employee_id);
        }
      }
    }
    const sellersCount = distinctEmployeeIds.size;

    const indicators: Indicator[] = [
      { label: "Faturamento", value: formatCurrency(totalFaturamento) },
      { label: "Comissao total", value: formatCurrency(totalComissao) },
      { label: "Pagamentos", value: String(payments.length) },
      { label: "Funcionarios com vendas", value: String(sellersCount) },
    ];

    const saldoFinal = Number(summary?.saldo_final ?? 0);
    const openingDate = summary?.saldo_inicial_data ?? null;
    const openingAfterEnd = openingDate !== null && openingDate > end;
    const saldoInicialNoPeriodo = Number(
      summary?.saldo_inicial_no_periodo ?? 0,
    );

    const statementLines: StatementLine[] = summary
      ? [
          {
            label: "Saldo anterior",
            value: formatCurrency(Number(summary.saldo_anterior)),
          },
          ...(saldoInicialNoPeriodo !== 0
            ? [
                {
                  label: "Saldo inicial",
                  value: formatCurrency(saldoInicialNoPeriodo),
                },
              ]
            : []),
          {
            label: "Receitas (+)",
            value: formatCurrency(Number(summary.receitas)),
          },
          {
            label: "Entradas avulsas (+)",
            value: formatCurrency(Number(summary.entradas_avulsas)),
          },
          {
            label: "Comissoes (-)",
            value: formatCurrency(Number(summary.comissoes)),
          },
          {
            label: "Taxas de cartao (-)",
            value: formatCurrency(Number(summary.taxas_cartao)),
          },
          {
            label: "Compras de estoque (-)",
            value: formatCurrency(Number(summary.compras_estoque)),
          },
          {
            label: "Despesas (-)",
            value: formatCurrency(Number(summary.despesas)),
          },
        ]
      : [];

    const paymentMethodGroups = new Map<string, PaymentMethodGroup>();

    for (const payment of payments) {
      const methodValue = payment.forma_pagamento;
      const existing = paymentMethodGroups.get(methodValue);
      const quantidadePagamentos = (existing?.quantidadePagamentos ?? 0) + 1;
      const totalBruto = roundToTwo(
        (existing?.totalBruto ?? 0) + Number(payment.valor ?? 0),
      );
      const totalTaxa = roundToTwo(
        (existing?.totalTaxa ?? 0) + Number(payment.valor_taxa ?? 0),
      );
      const totalLiquido = roundToTwo(totalBruto - totalTaxa);

      paymentMethodGroups.set(methodValue, {
        value: methodValue,
        label:
          PAYMENT_METHODS.find((m) => m.value === methodValue)?.label ??
          methodValue,
        quantidadePagamentos,
        totalBruto,
        totalTaxa,
        totalLiquido,
      });
    }

    const sortedPaymentMethods: PaymentMethodGroup[] = [];

    // Always show the 4 fixed methods, even with 0 payments
    for (const methodValue of MAIN_METHODS) {
      const group = paymentMethodGroups.get(methodValue);
      if (group) {
        sortedPaymentMethods.push(group);
      } else {
        // Create a default entry with 0 values for methods without payments
        const method = PAYMENT_METHODS.find((m) => m.value === methodValue);
        if (method) {
          sortedPaymentMethods.push({
            value: methodValue,
            label: method.label,
            quantidadePagamentos: 0,
            totalBruto: 0,
            totalTaxa: 0,
            totalLiquido: 0,
          });
        }
      }
    }

    // Add "Outros" group for unrecognized payment methods
    const outrosGroup: PaymentMethodGroup | null = (() => {
      let totalBruto = 0;
      let totalTaxa = 0;
      let quantidadePagamentos = 0;

      for (const [methodValue, group] of paymentMethodGroups) {
        if (
          !MAIN_METHODS.includes(methodValue as (typeof MAIN_METHODS)[number])
        ) {
          totalBruto += group.totalBruto;
          totalTaxa += group.totalTaxa;
          quantidadePagamentos += group.quantidadePagamentos;
        }
      }

      return quantidadePagamentos > 0
        ? {
            value: "outros",
            label: "Outros",
            quantidadePagamentos,
            totalBruto,
            totalTaxa,
            totalLiquido: roundToTwo(totalBruto - totalTaxa),
          }
        : null;
    })();

    if (outrosGroup) {
      sortedPaymentMethods.push(outrosGroup);
    }

    return (
      <>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {indicators.map((item) => (
              <div
                key={item.label}
                className="min-h-14 min-w-0 rounded-xl border border-border bg-surface px-3 py-2"
              >
                <p className="truncate text-xs text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-base font-semibold break-words tabular-nums text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <Panel
            title="Resumo do periodo"
            description="Saldo anterior + receitas + entradas - comissoes - taxas de cartao - compras - despesas = saldo final"
          >
            {summary ? (
              <>
                <StatCard
                  label="Saldo final"
                  value={formatCurrency(saldoFinal)}
                  tone={saldoFinal < 0 ? "danger" : "success"}
                />
                <ul className="mt-3 divide-y divide-border">
                  {statementLines.map((line) => (
                    <li
                      key={line.label}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0 text-muted-foreground">
                        {line.label}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-foreground">
                        {line.value}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  Consumo de estoque no periodo (nao entra no saldo):{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(Number(summary.consumo_estoque))}
                  </span>
                </p>
                {openingAfterEnd && openingDate ? (
                  <p className="mt-2 rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 text-sm text-amber-200">
                    O caixa comeca em {formatDateBR(openingDate)}; periodos
                    anteriores aparecem zerados.
                  </p>
                ) : null}
                {openingDate === null ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Sem saldo inicial: o saldo considera apenas o historico do
                      app.
                    </p>
                    <OpeningBalanceCard entry={null} />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-3 text-sm text-amber-200">
                Nao foi possivel calcular o resumo. Verifique se o script 016
                foi executado.
              </p>
            )}
          </Panel>

          <Panel
            title="Recebido por forma de pagamento"
            description="Agrupado por metodo de pagamento com totais bruto, taxas e liquido."
          >
            {payments.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
                Nenhum pagamento neste periodo.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {sortedPaymentMethods.map((method) => (
                    <div
                      key={method.value}
                      className="min-h-14 min-w-0 rounded-xl border border-border bg-surface px-3 py-2"
                    >
                      <p className="truncate text-xs text-muted-foreground">
                        {method.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {method.quantidadePagamentos} pagamento(s)
                      </p>
                      <p className="text-sm font-semibold break-words tabular-nums text-foreground">
                        {formatCurrency(method.totalBruto)}
                      </p>
                      {CARD_METHODS.has(
                        method.value as "cartao_credito" | "cartao_debito",
                      ) && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1">
                            Taxa: {formatCurrency(method.totalTaxa)}
                          </p>
                          <p className="text-xs font-medium text-foreground">
                            Líquido: {formatCurrency(method.totalLiquido)}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="min-h-14 min-w-0 rounded-xl border border-border bg-surface-2 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-foreground">
                      Total Geral
                    </p>
                    <p className="text-sm font-semibold break-words tabular-nums text-foreground">
                      {formatCurrency(totalFaturamento)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Por forma de pagamento"
            description="Entradas, saídas e saldo do período em cada forma."
          >
            {financeByMethod.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
                Sem dados de forma de pagamento neste período.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {financeByMethod.map((item) => {
                    const isNaoInformado = item.forma === "nao_informado";
                    const allZero =
                      item.entradas === 0 &&
                      item.saidas === 0 &&
                      item.saldo === 0;

                    if (isNaoInformado && allZero) {
                      return null;
                    }

                    const label =
                      item.forma === "nao_informado"
                        ? "Não informado"
                        : getPaymentMethodLabel(item.forma);

                    return (
                      <div
                        key={item.forma}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="md:flex md:items-center md:justify-center">
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-3 md:mb-0">
                                {label}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Entradas
                            </p>
                            <p className="text-sm font-semibold text-emerald-300">
                              {formatCurrency(item.entradas)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Saídas
                            </p>
                            <p className="text-sm font-semibold text-rose-300">
                              {formatCurrency(
                                item.saidas === 0 ? 0 : -item.saidas,
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p
                            className={`text-sm font-semibold ${item.saldo >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                          >
                            {formatCurrency(item.saldo)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Comissões, compras de estoque e lançamentos antigos sem forma
                  aparecem em Não informado. A taxa de cartão já está descontada
                  em Débito e Crédito.
                </p>
              </>
            )}
          </Panel>
        </div>
      </>
    );
  }

  // ============ TAB: CAIXA ============
  if (tab === "caixa") {
    const [entriesResponse, openingResponse] = await Promise.all([
      supabase
        .from("cash_entries")
        .select(
          "id, tipo, valor, categoria, descricao, forma_pagamento, data_lancamento",
        )
        .eq("company_id", companyId)
        .in("tipo", ["entrada", "despesa"])
        .gte("data_lancamento", start)
        .lte("data_lancamento", end)
        .order("data_lancamento", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("cash_entries")
        .select("id, valor, valor_pix, valor_conta, data_lancamento")
        .eq("company_id", companyId)
        .eq("tipo", "saldo_inicial")
        .maybeSingle(),
    ]);

    const cashEntries = (entriesResponse.data ?? []) as Pick<
      CashEntry,
      | "id"
      | "tipo"
      | "valor"
      | "categoria"
      | "descricao"
      | "forma_pagamento"
      | "data_lancamento"
    >[];
    const openingRow = openingResponse.data as {
      id: string;
      valor: number;
      valor_pix: number;
      valor_conta: number;
      data_lancamento: string;
    } | null;

    const openingEntry = openingRow
      ? {
          id: openingRow.id,
          valor: Number(openingRow.valor ?? 0),
          valorPix: Number(openingRow.valor_pix ?? 0),
          valorConta: Number(openingRow.valor_conta ?? 0),
          data: openingRow.data_lancamento,
        }
      : null;

    const cashItems = cashEntries.map((entry) => ({
      id: entry.id,
      tipo:
        entry.tipo === "entrada" ? ("entrada" as const) : ("despesa" as const),
      valor: Number(entry.valor),
      categoria: entry.categoria,
      descricao: entry.descricao,
      forma_pagamento: entry.forma_pagamento,
      data: entry.data_lancamento,
    }));

    const openingDate = openingEntry?.data ?? null;
    let movimentosAnteriores = 0;

    if (openingDate) {
      const cutoffIso = `${openingDate}T00:00:00-03:00`;
      const [paymentsBefore, purchasesBefore, entriesBefore] =
        await Promise.all([
          supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .lt("created_at", cutoffIso),
          supabase
            .from("stock_movements")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("tipo", "entrada")
            .eq("motivo", "compra")
            .lt("data_movimento", cutoffIso),
          supabase
            .from("cash_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("tipo", ["entrada", "despesa"])
            .lt("data_lancamento", openingDate),
        ]);

      movimentosAnteriores = [
        paymentsBefore,
        purchasesBefore,
        entriesBefore,
      ].reduce(
        (sum, response) => sum + (response.error ? 0 : (response.count ?? 0)),
        0,
      );
    }

    return (
      <>
        <Panel
          title="Caixa"
          description="Saldo inicial e lancamentos avulsos de entrada e despesa no periodo."
          actions={<CashEntryDialog />}
        >
          <div className="space-y-4">
            <OpeningBalanceCard
              entry={openingEntry}
              movimentosAnteriores={movimentosAnteriores}
            />

            <h3 className="text-sm font-semibold text-foreground">
              Lancamentos do periodo
            </h3>

            {cashItems.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
                Nenhum lancamento avulso neste periodo. Use o botao Novo
                lancamento para registrar entradas e despesas como aluguel ou
                energia.
              </p>
            ) : (
              <div className="space-y-2">
                {cashItems.map((entry) => (
                  <CashEntryItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </Panel>
      </>
    );
  }

  // ============ TAB: FUNCIONARIOS ============
  if (tab === "funcionarios") {
    const [employeesResponse, paymentsResponse] = await Promise.all([
      supabase
        .from("employees")
        .select("id, nome, percentual_comissao")
        .eq("company_id", companyId),
      supabase
        .from("payments")
        .select("valor, valor_comissao, appointments(employee_id)")
        .eq("company_id", companyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
    ]);

    const employees = (employeesResponse.data ?? []) as EmployeeRow[];
    const payments = (paymentsResponse.data ?? []) as PaymentRow[];

    const employeeFinancialMap = new Map<string, EmployeeFinancialSummary>(
      employees.map((employee) => [
        employee.id,
        {
          id: employee.id,
          nome: employee.nome,
          percentualComissao: roundToTwo(
            Number(employee.percentual_comissao ?? 0),
          ),
          quantidadePagamentos: 0,
          faturamento: 0,
          comissaoTotal: 0,
        },
      ]),
    );

    for (const payment of payments) {
      const appointments = payment.appointments;
      const appointment = Array.isArray(appointments)
        ? appointments[0]
        : appointments;
      const appointmentEmployeeId = appointment?.employee_id;

      if (!appointmentEmployeeId) {
        continue;
      }

      const summary = employeeFinancialMap.get(appointmentEmployeeId);

      if (!summary) {
        employeeFinancialMap.set(appointmentEmployeeId, {
          id: appointmentEmployeeId,
          nome: "Funcionario nao encontrado",
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

    return (
      <>
        <Panel
          title="Faturamento por funcionario"
          description="Valores calculados com base nos pagamentos concluidos."
        >
          {employeeFinancialSummaries.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              Nenhum funcionario cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {employeeFinancialSummaries.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.nome}
                  subtitle={`Comissao ${formatCurrency(item.comissaoTotal)} - ${
                    item.quantidadePagamentos
                  } pagamento(s)`}
                  columns={[
                    {
                      label: "Comissao",
                      value: formatCurrency(item.comissaoTotal),
                    },
                    {
                      label: "Pagamentos",
                      value: `${
                        item.quantidadePagamentos
                      } | ${item.percentualComissao.toFixed(2)}%`,
                    },
                  ]}
                  status={
                    <span className="text-sm font-semibold whitespace-nowrap tabular-nums text-foreground">
                      {formatCurrency(item.faturamento)}
                    </span>
                  }
                  hideSubtitleOnDesktop
                  actions={null}
                />
              ))}
            </div>
          )}
        </Panel>
      </>
    );
  }

  // ============ TAB: PAGAMENTOS ============
  if (tab === "pagamentos") {
    const [
      appointmentsResponse,
      servicesResponse,
      employeesResponse,
      paymentsResponse,
      allPaymentIdsResponse,
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, cliente_nome, data_hora, status, service_id, employee_id")
        .eq("company_id", companyId)
        .eq("status", "concluido")
        .order("data_hora", { ascending: false }),
      supabase.from("services").select("id, valor").eq("company_id", companyId),
      supabase
        .from("employees")
        .select("id, nome, percentual_comissao")
        .eq("company_id", companyId),
      supabase
        .from("payments")
        .select(
          "id, appointment_id, created_at, valor, forma_pagamento, percentual_comissao, valor_comissao, taxa_percentual, valor_taxa, appointments(cliente_nome, data_hora, employee_id)",
        )
        .eq("company_id", companyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("appointment_id")
        .eq("company_id", companyId),
    ]);

    const appointments = (appointmentsResponse.data ?? []) as AppointmentRow[];
    const services = (servicesResponse.data ?? []) as ServiceRow[];
    const employees = (employeesResponse.data ?? []) as EmployeeRow[];
    const payments = (paymentsResponse.data ?? []) as PaymentRow[];
    const allPaymentIds = (allPaymentIdsResponse.data ?? []) as Array<{
      appointment_id: string;
    }>;

    const serviceValueById = new Map(
      services.map((service) => [service.id, Number(service.valor)]),
    );
    const employeeCommissionById = new Map(
      employees.map((employee) => [
        employee.id,
        Number(employee.percentual_comissao ?? 0),
      ]),
    );

    const paidAppointmentIds = new Set(
      allPaymentIds.map((payment) => payment.appointment_id),
    );

    const availableAppointments: AppointmentOption[] = appointments
      .filter((appointment) => !paidAppointmentIds.has(appointment.id))
      .map((appointment) => {
        const valorSugerido = Number(
          serviceValueById.get(appointment.service_id) ?? 0,
        );
        const percentualComissaoSugerido = Number(
          employeeCommissionById.get(appointment.employee_id) ?? 0,
        );

        return {
          id: appointment.id,
          clienteNome: appointment.cliente_nome,
          dataHora: appointment.data_hora,
          valorSugerido: roundToTwo(valorSugerido),
          percentualComissaoSugerido: roundToTwo(percentualComissaoSugerido),
        };
      });

    const paymentItems = payments.map((payment) => {
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
        taxaPercentual: Number(payment.taxa_percentual),
        valorTaxa: Number(payment.valor_taxa),
      };
    });

    return (
      <>
        <div className="space-y-4">
          {availableAppointments.length === 0 ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
              Nao ha agendamentos concluidos disponiveis para novo pagamento.
            </p>
          ) : (
            <CreatePaymentForm appointments={availableAppointments} />
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-medium text-zinc-100">
              Lista de pagamentos
            </h2>

            {paymentItems.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
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
      </>
    );
  }

  // Fallback: should never reach here if tab is valid
  return <></>;
}
