"use server";

import { revalidatePath } from "next/cache";

import { calculateEndDateIso } from "@/lib/appointments/conflict";
import { canPerformAction, getAccessContext, isAdmin } from "@/lib/auth/access";
import { findOrCreateCustomer } from "@/lib/customers/find-or-create";
import { localDateTimeToIso } from "@/lib/datetime";

type ActionState = {
  success: boolean;
  message: string;
};

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

const APPOINTMENT_STATUS: AppointmentStatus[] = [
  "agendado",
  "concluido",
  "cancelado",
];

function mapAppointmentDatabaseError(message: string): string {
  if (message.includes("data_hora_fim")) {
    return "Seu banco ainda nao foi atualizado para conflitos de horario. Execute o script docs/database/002_etapa6_conflito_agendamentos.sql no Supabase SQL Editor e tente novamente.";
  }

  if (
    message.includes("customer_id") ||
    message.includes("appointments_customer_company_fk")
  ) {
    return "Seu banco ainda nao foi atualizado para clientes em agendamentos. Execute o script docs/database/006_etapa13_agendamentos_clientes.sql no Supabase SQL Editor e tente novamente.";
  }

  return message;
}

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
      errorMessage: mapAppointmentDatabaseError(error.message),
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

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

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

  const { error } = await supabase.from("appointments").insert({
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
  });

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel criar agendamento: ${mapAppointmentDatabaseError(error.message)}`,
    };
  }

  revalidatePath("/painel/agendamentos");
  if (newCustomerCreated) {
    revalidatePath("/painel/clientes");
  }
  return {
    success: true,
    message: customerLinkFailed
      ? "Agendamento criado, mas nao foi possivel cadastrar o cliente automaticamente."
      : "Agendamento criado com sucesso.",
  };
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

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

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
    return {
      success: false,
      message: `Nao foi possivel atualizar agendamento: ${mapAppointmentDatabaseError(error.message)}`,
    };
  }

  revalidatePath("/painel/agendamentos");
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

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel excluir agendamento: ${error.message}`,
    };
  }

  revalidatePath("/painel/agendamentos");
  return { success: true, message: "Agendamento excluido com sucesso." };
}

function sanitizeMoney(value: FormDataEntryValue | null): number {
  const textValue = sanitizeText(value).replace(",", ".");
  const parsedValue = Number(textValue);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
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

  const [{ data: service }, { data: employee }] = await Promise.all([
    supabase
      .from("services")
      .select("id, valor")
      .eq("id", appointment.service_id)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, percentual_comissao")
      .eq("id", appointment.employee_id)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (!service) {
    return {
      success: false,
      message: "Nao foi possivel obter dados do servico deste agendamento.",
    };
  }

  const valorFinalParsed = sanitizeMoney(formData.get("valor_final"));
  const valor =
    valorFinalInput && Number.isFinite(valorFinalParsed)
      ? valorFinalParsed
      : Number(service.valor);

  if (!Number.isFinite(valor) || valor < 0) {
    return {
      success: false,
      message: "Informe um valor valido para o pagamento.",
    };
  }

  const percentualComissao = Number(employee?.percentual_comissao ?? 0);
  const valorComissao =
    Math.round(((valor * percentualComissao) / 100) * 100) / 100;

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
      message: `Nao foi possivel concluir o agendamento: ${mapAppointmentDatabaseError(updateError.message)}`,
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
      message: `Nao foi possivel registrar o pagamento: ${paymentError.message}`,
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
