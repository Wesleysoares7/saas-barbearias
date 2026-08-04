"use server";

import { revalidatePath } from "next/cache";

import { calculateEndDateIso } from "@/lib/appointments/conflict";
import { canPerformAction, getAccessContext } from "@/lib/auth/access";

type ActionState = {
  success: boolean;
  message: string;
};

type AppointmentStatus = "agendado" | "concluido" | "cancelado";

const APPOINTMENT_STATUS: AppointmentStatus[] = ["agendado", "concluido", "cancelado"];

function mapAppointmentDatabaseError(message: string): string {
  if (message.includes("data_hora_fim")) {
    return "Seu banco ainda nao foi atualizado para conflitos de horario. Execute o script docs/database/002_etapa6_conflito_agendamentos.sql no Supabase SQL Editor e tente novamente.";
  }

  if (message.includes("customer_id") || message.includes("appointments_customer_company_fk")) {
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
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
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
    supabase.from("employees").select("id").eq("id", employeeId).eq("company_id", companyId).maybeSingle(),
    supabase.from("services").select("id").eq("id", serviceId).eq("company_id", companyId).maybeSingle(),
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

export async function createAppointmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const customerIdInput = sanitizeText(formData.get("customer_id"));
  const clienteNomeInput = sanitizeText(formData.get("cliente_nome"));
  const clienteTelefoneInput = sanitizeText(formData.get("cliente_telefone"));
  const employeeId = sanitizeText(formData.get("employee_id"));
  const serviceId = sanitizeText(formData.get("service_id"));
  const dataHoraInput = sanitizeText(formData.get("data_hora"));
  const statusInput = sanitizeText(formData.get("status"));
  const observacoes = sanitizeText(formData.get("observacoes"));

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
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!canPerformAction(role, "agendamentos", "create")) {
    return { success: false, message: "Seu perfil nao tem permissao para criar agendamentos." };
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
      return { success: false, message: "Cliente selecionado invalido para sua empresa." };
    }

    clienteNome = String(customer.nome ?? "").trim();
    clienteTelefone = String(customer.telefone ?? "").trim();
  } else {
    customerId = null;
  }

  if (clienteNome.length < 2) {
    return { success: false, message: "Informe o nome do cliente com pelo menos 2 caracteres." };
  }

  const referenceError = await ensureReferencesBelongToCompany(employeeId, serviceId, companyId, supabase);

  if (referenceError) {
    return { success: false, message: referenceError };
  }

  const durationMinutes = await getServiceDurationMinutes(serviceId, companyId, supabase);

  if (!durationMinutes) {
    return { success: false, message: "Nao foi possivel calcular a duracao do servico selecionado." };
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
  return { success: true, message: "Agendamento criado com sucesso." };
}

export async function updateAppointmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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
    return { success: false, message: "Agendamento invalido para atualizacao." };
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
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!canPerformAction(role, "agendamentos", "update")) {
    return { success: false, message: "Seu perfil nao tem permissao para atualizar agendamentos." };
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
      return { success: false, message: "Cliente selecionado invalido para sua empresa." };
    }

    clienteNome = String(customer.nome ?? "").trim();
    clienteTelefone = String(customer.telefone ?? "").trim();
  } else {
    customerId = null;
  }

  if (clienteNome.length < 2) {
    return { success: false, message: "Informe o nome do cliente com pelo menos 2 caracteres." };
  }

  const referenceError = await ensureReferencesBelongToCompany(employeeId, serviceId, companyId, supabase);

  if (referenceError) {
    return { success: false, message: referenceError };
  }

  const durationMinutes = await getServiceDurationMinutes(serviceId, companyId, supabase);

  if (!durationMinutes) {
    return { success: false, message: "Nao foi possivel calcular a duracao do servico selecionado." };
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
        message: "O horario selecionado esta indisponivel para este funcionario.",
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

export async function deleteAppointmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Agendamento invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId || !role) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!canPerformAction(role, "agendamentos", "delete")) {
    return { success: false, message: "Seu perfil nao tem permissao para excluir agendamentos." };
  }

  const { error } = await supabase.from("appointments").delete().eq("id", id).eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel excluir agendamento: ${error.message}` };
  }

  revalidatePath("/painel/agendamentos");
  return { success: true, message: "Agendamento excluido com sucesso." };
}
