"use server";

import { friendlyDbError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

import { calculateEndDateIso } from "@/lib/appointments/conflict";
import { canPerformAction, getAccessContext, isAdmin } from "@/lib/auth/access";
import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { isoToLocalInputValue, localDateTimeToIso } from "@/lib/datetime";
import { isPaymentMethod } from "@/lib/payment-methods";

type ActionState = {
  success: boolean;
  message: string;
};

const CUSTOMER_LINK_FAILED_MESSAGE =
  "Agendamento criado, mas nao foi possivel cadastrar o cliente automaticamente.";

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

const APPOINTMENT_STATUS: AppointmentStatus[] = [
  "agendado",
  "concluido",
  "cancelado",
];

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseDateTimeLocal(value: string): string | null {
  return localDateTimeToIso(value);
}

async function getCompanyScope() {
  return getAccessContext();
}

function validateStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus);
}

async function ensureReferencesBelongToCompany(
  employeeId: string,
  serviceId: string,
  companyId: string,
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"],
): Promise<string | null> {
  const [{ data: employee }, { data: service }] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (!employee) {
    return "Funcionario invalido para sua empresa.";
  }

  if (!service) {
    return "Servico invalido para sua empresa.";
  }

  return null;
}

async function getServiceDurationMinutes(
  serviceId: string,
  companyId: string,
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"],
): Promise<number | null> {
  const { data: service } = await supabase
    .from("services")
    .select("duracao")
    .eq("id", serviceId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!service) {
    return null;
  }

  const durationMinutes = Number(service.duracao);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return Math.trunc(durationMinutes);
}

async function hasConflictForEmployee(
  params: {
    companyId: string;
    employeeId: string;
    newStartIso: string;
    newEndIso: string;
    ignoreAppointmentId?: string;
  },
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"],
): Promise<{ hasConflict: boolean; errorMessage: string | null }> {
  const query = supabase
    .from("appointments")
    .select("id")
    .eq("company_id", params.companyId)
    .eq("employee_id", params.employeeId)
    .eq("status", "agendado")
    .lt("data_hora", params.newEndIso)
    .gt("data_hora_fim", params.newStartIso)
    .limit(1);

  if (params.ignoreAppointmentId) {
    query.neq("id", params.ignoreAppointmentId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      hasConflict: false,
      errorMessage: friendlyDbError(error, "Nao foi possivel verificar conflito de horario. Tente novamente."),
    };
  }

  return { hasConflict: (data?.length ?? 0) > 0, errorMessage: null };
}

export async function createAppointmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerIdInput = sanitizeText(formData.get("customer_id"));
  const clienteNomeInput = sanitizeText(formData.get("cliente_nome"));
  const clienteTelefoneInput = sanitizeText(formData.get("cliente_telefone"));
  const employeeId = sanitizeText(formData.get("employee_id"));
  const serviceId = sanitizeText(formData.get("service_id"));
  const dataHoraInput = sanitizeText(formData.get("data_hora"));
  const statusInput = sanitizeText(formData.get("status"));
  const observacoes = sanitizeText(formData.get("observacoes"));
  const clienteEmail = sanitizeText(formData.get("cliente_email"));
  const clienteObservacoes = sanitizeText(formData.get("cliente_observacoes"));

  if (!employeeId) {
    return { success: false, message: "Selecione um funcionario." };
  }

  if (!serviceId) {
    return { success: false, message: "Selecione um servico." };
  }

  const dataHora = parseDateTimeLocal(dataHoraInput);

  if (!dataHora) {
    return { success: false, message: "Informe uma data e horario validos." };
  }

  if (!validateStatus(statusInput)) {
    return { success: false, message: "Status de agendamento invalido." };
  }

  const formaPagamento = sanitizeText(formData.get("forma_pagamento"));

  if (statusInput === "concluido" && !formaPagamento) {
    return { success: false, message: "Selecione a forma de pagamento." };
  }

  if (statusInput === "concluido" && !isPaymentMethod(formaPagamento)) {
    return { success: false, message: "Forma de pagamento invalida. Escolha uma das opcoes disponiveis." };
  }

  const { supabase, companyId, role, errorMessage, employeeId: ownEmployeeId } = await getCompanyScope();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!canPerformAction(role, "agendamentos", "create")) {
    return {
      success: false,
      message: "Seu perfil nao tem permissao para criar agendamentos.",
    };
  }

  if (statusInput === "concluido" && !canPerformAction(role, "financeiro", "create")) {
    return {
      success: false,
      message: "Seu perfil nao tem permissao para registrar pagamentos.",
    };
  }

  if (role === "employee" && ownEmployeeId && employeeId !== ownEmployeeId) {
    return { success: false, message: "Voce so pode gerenciar seus proprios atendimentos." };
  }

  let customerId: string | null = customerIdInput || null;
  let clienteNome = clienteNomeInput;
  let clienteTelefone = clienteTelefoneInput;

  let customerLinkFailed = false;
  let newCustomerCreated = false;

  if (!customerId && clienteNome.length >= 2) {
    const result = await findOrCreateCustomer(supabase, companyId, {
      nome: clienteNome,
      telefone: clienteTelefone,
      email: clienteEmail,
      observacoes: clienteObservacoes,
    });

    if (result.ok) {
      customerId = result.id;
      clienteNome = result.nome.trim();
      clienteTelefone = (result.telefone ?? "").trim();
      newCustomerCreated = result.created;
    } else {
      customerLinkFailed = true;
    }
  }

  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, nome, telefone")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!customer) {
      return {
        success: false,
        message: "Cliente selecionado invalido para sua empresa.",
      };
    }

    clienteNome = String(customer.nome ?? "").trim();
    clienteTelefone = String(customer.telefone ?? "").trim();
  } else {
    customerId = null;
  }

  if (clienteNome.length < 2) {
    return {
      success: false,
      message: "Informe o nome do cliente com pelo menos 2 caracteres.",
    };
  }

  const referenceError = await ensureReferencesBelongToCompany(
    employeeId,
    serviceId,
    companyId,
    supabase,
  );

  if (referenceError) {
    return { success: false, message: referenceError };
  }

  const durationMinutes = await getServiceDurationMinutes(
    serviceId,
    companyId,
    supabase,
  );

  if (!durationMinutes) {
    return {
      success: false,
      message: "Nao foi possivel calcular a duracao do servico selecionado.",
    };
  }

  const dataHoraFim = calculateEndDateIso(dataHora, durationMinutes);

  if (statusInput === "agendado") {
    const conflictResult = await hasConflictForEmployee(
      {
        companyId,
        employeeId,
        newStartIso: dataHora,
        newEndIso: dataHoraFim,
      },
      supabase,
    );

    if (conflictResult.errorMessage) {
      return {
        success: false,
        message: conflictResult.errorMessage,
      };
    }

    if (conflictResult.hasConflict) {
      return {
        success: false,
        message: "Este funcionario ja possui um agendamento nesse horario.",
      };
    }
  }

  let paymentCalc: Extract<PaymentCalcResult, { ok: true }> = {
    ok: true,
    valor: 0,
    percentualComissao: 0,
    valorComissao: 0,
  };

  if (statusInput === "concluido") {
    const calc = await calculatePaymentValues(
      supabase,
      companyId,
      serviceId,
      employeeId,
      formData.get("valor_final"),
    );

    if (!calc.ok) {
      return { success: false, message: calc.message };
    }

    paymentCalc = calc;
  }

  const { data: created, error } = await supabase
    .from("appointments")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone || null,
      employee_id: employeeId,
      service_id: serviceId,
      data_hora: dataHora,
      data_hora_fim: dataHoraFim,
      status: statusInput,
      observacoes: observacoes || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      success: false,
      message: friendlyDbError(error, "Nao foi possivel criar agendamento. Tente novamente."),
    };
  }

  if (statusInput === "concluido") {
    const { error: paymentError } = await supabase.from("payments").insert({
      company_id: companyId,
      appointment_id: created.id,
      valor: paymentCalc.valor,
      forma_pagamento: formaPagamento,
      percentual_comissao: paymentCalc.percentualComissao,
      valor_comissao: paymentCalc.valorComissao,
    });

    if (paymentError) {
      await supabase
        .from("appointments")
        .delete()
        .eq("id", created.id)
        .eq("company_id", companyId);

      return {
        success: false,
        message: friendlyDbError(paymentError, "Nao foi possivel registrar o pagamento. Tente novamente."),
      };
    }

    revalidatePath("/painel");
    revalidatePath("/painel/financeiro");
  }

  revalidatePath("/painel/agendamentos");
  if (newCustomerCreated) {
    revalidatePath("/painel/clientes");
  }
  return {
    success: true,
    message: customerLinkFailed
      ? CUSTOMER_LINK_FAILED_MESSAGE
      : "Agendamento criado com sucesso.",
  };
}

export async function createQuickAppointmentAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const quickData = new FormData();

  const quickKeys = [
    "employee_id",
    "service_id",
    "forma_pagamento",
    "valor_final",
    "customer_id",
    "cliente_telefone",
    "cliente_email",
    "cliente_observacoes",
  ];

  for (const key of quickKeys) {
    quickData.set(key, sanitizeText(formData.get(key)));
  }

  quickData.set("cliente_nome", sanitizeText(formData.get("cliente_nome")) || "Cliente avulso");
  quickData.set("status", "concluido");
  quickData.set("data_hora", isoToLocalInputValue(new Date().toISOString()));

  const result = await createAppointmentAction(prevState, quickData);

  if (!result.success || result.message === CUSTOMER_LINK_FAILED_MESSAGE) {
    return result;
  }

  return { success: true, message: "Atendimento rapido registrado com sucesso." };
}

export async function updateAppointmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const customerIdInput = sanitizeText(formData.get("customer_id"));
  const clienteNomeInput = sanitizeText(formData.get("cliente_nome"));
  const clienteTelefoneInput = sanitizeText(formData.get("cliente_telefone"));
  const employeeId = sanitizeText(formData.get("employee_id"));
  const serviceId = sanitizeText(formData.get("service_id"));
  const dataHoraInput = sanitizeText(formData.get("data_hora"));
  const statusInput = sanitizeText(formData.get("status"));
  const observacoes = sanitizeText(formData.get("observacoes"));

  if (!id) {
    return {
      success: false,
      message: "Agendamento invalido para atualizacao.",
    };
  }

  if (!employeeId) {
    return { success: false, message: "Selecione um funcionario." };
  }

  if (!serviceId) {
    return { success: false, message: "Selecione um servico." };
  }

  const dataHora = parseDateTimeLocal(dataHoraInput);

  if (!dataHora) {
    return { success: false, message: "Informe uma data e horario validos." };
  }

  if (!validateStatus(statusInput)) {
    return { success: false, message: "Status de agendamento invalido." };
  }

  const { supabase, companyId, role, errorMessage, employeeId: ownEmployeeId } = await getCompanyScope();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!canPerformAction(role, "agendamentos", "update")) {
    return {
      success: false,
      message: "Seu perfil nao tem permissao para atualizar agendamentos.",
    };
  }

  if (role === "employee" && ownEmployeeId) {
    const { data: existing } = await supabase
      .from("appointments")
      .select("employee_id")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (employeeId !== ownEmployeeId || !existing || existing.employee_id !== ownEmployeeId) {
      return { success: false, message: "Voce so pode gerenciar seus proprios atendimentos." };
    }
  }

  const { data: currentAppointment, error: currentError } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (currentError || !currentAppointment) {
    return { success: false, message: "Agendamento invalido para sua empresa." };
  }

  const reopensCompleted =
    currentAppointment.status === "concluido" &&
    (statusInput === "cancelado" || statusInput === "agendado");

  if (reopensCompleted && !isAdmin(role)) {
    return {
      success: false,
      message:
        "Somente o administrador pode reabrir ou cancelar um atendimento concluido.",
    };
  }

  let customerId: string | null = customerIdInput || null;
  let clienteNome = clienteNomeInput;
  let clienteTelefone = clienteTelefoneInput;

  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, nome, telefone")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!customer) {
      return {
        success: false,
        message: "Cliente selecionado invalido para sua empresa.",
      };
    }

    clienteNome = String(customer.nome ?? "").trim();
    clienteTelefone = String(customer.telefone ?? "").trim();
  } else {
    customerId = null;
  }

  if (clienteNome.length < 2) {
    return {
      success: false,
      message: "Informe o nome do cliente com pelo menos 2 caracteres.",
    };
  }

  const referenceError = await ensureReferencesBelongToCompany(
    employeeId,
    serviceId,
    companyId,
    supabase,
  );

  if (referenceError) {
    return { success: false, message: referenceError };
  }

  const durationMinutes = await getServiceDurationMinutes(
    serviceId,
    companyId,
    supabase,
  );

  if (!durationMinutes) {
    return {
      success: false,
      message: "Nao foi possivel calcular a duracao do servico selecionado.",
    };
  }

  const dataHoraFim = calculateEndDateIso(dataHora, durationMinutes);

  if (statusInput === "agendado") {
    const conflictResult = await hasConflictForEmployee(
      {
        companyId,
        employeeId,
        newStartIso: dataHora,
        newEndIso: dataHoraFim,
        ignoreAppointmentId: id,
      },
      supabase,
    );

    if (conflictResult.errorMessage) {
      return {
        success: false,
        message: conflictResult.errorMessage,
      };
    }

    if (conflictResult.hasConflict) {
      return {
        success: false,
        message:
          "O horario selecionado esta indisponivel para este funcionario.",
      };
    }
  }

  let removedPayment: Record<string, unknown> | null = null;

  if (reopensCompleted) {
    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("appointment_id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (paymentFetchError) {
      return {
        success: false,
        message: friendlyDbError(paymentFetchError, "Nao foi possivel estornar o pagamento. Tente novamente."),
      };
    }

    if (payment) {
      const { error: paymentDeleteError } = await supabase
        .from("payments")
        .delete()
        .eq("appointment_id", id)
        .eq("company_id", companyId);

      if (paymentDeleteError) {
        return {
          success: false,
          message: friendlyDbError(paymentDeleteError, "Nao foi possivel estornar o pagamento. Tente novamente."),
        };
      }

      removedPayment = payment as Record<string, unknown>;
    }
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      customer_id: customerId,
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone || null,
      employee_id: employeeId,
      service_id: serviceId,
      data_hora: dataHora,
      data_hora_fim: dataHoraFim,
      status: statusInput,
      observacoes: observacoes || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    if (removedPayment) {
      await supabase.from("payments").insert(removedPayment);
    }

    return {
      success: false,
      message: friendlyDbError(error, "Nao foi possivel atualizar agendamento. Tente novamente."),
    };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/agendamentos");

  if (reopensCompleted) {
    revalidatePath("/painel/financeiro");
    return {
      success: true,
      message: "Agendamento atualizado e pagamento estornado com sucesso.",
    };
  }

  return { success: true, message: "Agendamento atualizado com sucesso." };
}

export async function deleteAppointmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Agendamento invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!canPerformAction(role, "agendamentos", "delete")) {
    return {
      success: false,
      message: "Seu perfil nao tem permissao para excluir agendamentos.",
    };
  }

  const motivo = sanitizeText(formData.get("motivo"));

  const { data, error } = await supabase.rpc("void_appointment", {
    p_appointment_id: id,
    p_motivo: motivo,
  });

  if (error) {
    return { success: false, message: translateVoidError(error) };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/agendamentos");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/relatorios");

  const refunded = data === null || data === undefined ? null : Number(data);

  if (refunded === null || !Number.isFinite(refunded)) {
    return { success: true, message: "Atendimento excluido." };
  }

  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(refunded);
  return { success: true, message: `Atendimento excluido. Pagamento de ${formatted} estornado.` };
}

function translateVoidError(error: { message: string; code?: string }): string {
  const text = error.message.toLowerCase();

  if (error.code === "42501" || text.includes("permission") || text.includes("admin") || text.includes("permiss")) {
    return "Apenas administradores podem excluir atendimentos.";
  }

  if (text.includes("not found") || text.includes("nao encontrado") || text.includes("não encontrado")) {
    return "Atendimento nao encontrado.";
  }

  if (text.includes("already") || text.includes("ja foi") || text.includes("já foi") || text.includes("excluido")) {
    return "Este atendimento ja foi excluido.";
  }

  return friendlyDbError(error, "Nao foi possivel excluir atendimento. Tente novamente.");
}

function sanitizeMoney(value: FormDataEntryValue | null): number {
  const textValue = sanitizeText(value).replace(",", ".");
  const parsedValue = Number(textValue);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

type PaymentCalcResult =
  | {
      ok: true;
      valor: number;
      percentualComissao: number;
      valorComissao: number;
    }
  | { ok: false; message: string };

async function calculatePaymentValues(
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"],
  companyId: string,
  serviceId: string,
  employeeId: string,
  valorFinalRaw: FormDataEntryValue | null,
): Promise<PaymentCalcResult> {
  const [{ data: service }, { data: employee }] = await Promise.all([
    supabase
      .from("services")
      .select("id, valor")
      .eq("id", serviceId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, percentual_comissao")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (!service) {
    return {
      ok: false,
      message: "Nao foi possivel obter dados do servico deste agendamento.",
    };
  }

  const valorFinalParsed = sanitizeMoney(valorFinalRaw);
  const valor =
    sanitizeText(valorFinalRaw) && Number.isFinite(valorFinalParsed)
      ? valorFinalParsed
      : Number(service.valor);

  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, message: "Informe um valor valido para o pagamento." };
  }

  const percentualComissao = Number(employee?.percentual_comissao ?? 0);
  const valorComissao =
    Math.round(((valor * percentualComissao) / 100) * 100) / 100;

  return { ok: true, valor, percentualComissao, valorComissao };
}

// Fluxo em etapa unica: concluir o atendimento e registrar o pagamento juntos.
// Supabase-js nao suporta transacao multi-tabela no client; em caso de falha ao
// inserir o pagamento, a atualizacao do status e revertida (melhor esforco).
export async function completeAppointmentAndRegisterPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const appointmentId = sanitizeText(formData.get("appointment_id"));
  const formaPagamento = sanitizeText(formData.get("forma_pagamento"));
  const valorFinalInput = sanitizeText(formData.get("valor_final"));
  const observacoes = sanitizeText(formData.get("observacoes"));

  if (!appointmentId) {
    return { success: false, message: "Agendamento invalido." };
  }

  if (!formaPagamento) {
    return { success: false, message: "Selecione a forma de pagamento." };
  }

  if (!isPaymentMethod(formaPagamento)) {
    return { success: false, message: "Forma de pagamento invalida. Escolha uma das opcoes disponiveis." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message:
        "Apenas administradores podem concluir atendimento e registrar pagamento.",
    };
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, service_id, employee_id")
    .eq("id", appointmentId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!appointment) {
    return {
      success: false,
      message: "Agendamento invalido para sua empresa.",
    };
  }

  if (appointment.status === "cancelado") {
    return {
      success: false,
      message: "Nao e possivel concluir um agendamento cancelado.",
    };
  }

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingPayment) {
    return {
      success: false,
      message: "Este agendamento ja possui pagamento registrado.",
    };
  }

  const paymentCalc = await calculatePaymentValues(
    supabase,
    companyId,
    appointment.service_id,
    appointment.employee_id,
    formData.get("valor_final"),
  );

  if (!paymentCalc.ok) {
    return { success: false, message: paymentCalc.message };
  }

  const { valor, percentualComissao, valorComissao } = paymentCalc;

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "concluido",
      ...(observacoes ? { observacoes } : {}),
    })
    .eq("id", appointmentId)
    .eq("company_id", companyId);

  if (updateError) {
    return {
      success: false,
      message: friendlyDbError(updateError, "Nao foi possivel concluir o agendamento. Tente novamente."),
    };
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    company_id: companyId,
    appointment_id: appointmentId,
    valor,
    forma_pagamento: formaPagamento,
    percentual_comissao: percentualComissao,
    valor_comissao: valorComissao,
  });

  if (paymentError) {
    await supabase
      .from("appointments")
      .update({ status: appointment.status })
      .eq("id", appointmentId)
      .eq("company_id", companyId);

    return {
      success: false,
      message: friendlyDbError(paymentError, "Nao foi possivel registrar o pagamento. Tente novamente."),
    };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/agendamentos");
  revalidatePath("/painel/financeiro");
  return {
    success: true,
    message: "Atendimento concluido e pagamento registrado com sucesso!",
  };
}
