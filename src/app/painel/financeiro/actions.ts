"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccessContext, isAdmin } from "@/lib/auth/access";

type ActionState = {
  success: boolean;
  message: string;
};

type AppointmentRow = {
  id: string;
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
  percentual_comissao: number | null;
};

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function sanitizeMoney(value: FormDataEntryValue | null): number {
  const textValue = sanitizeText(value).replace(",", ".");
  const parsedValue = Number(textValue);

  if (!Number.isFinite(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getCompanyScope() {
  return getAccessContext();
}

async function getAppointmentFinancialContext(
  params: {
    appointmentId: string;
    companyId: string;
  },
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  appointment: AppointmentRow | null;
  service: ServiceRow | null;
  employee: EmployeeRow | null;
}> {
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, service_id, employee_id")
    .eq("id", params.appointmentId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (!appointment) {
    return { appointment: null, service: null, employee: null };
  }

  const [serviceResponse, employeeResponse] = await Promise.all([
    supabase
      .from("services")
      .select("id, valor")
      .eq("id", appointment.service_id)
      .eq("company_id", params.companyId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, percentual_comissao")
      .eq("id", appointment.employee_id)
      .eq("company_id", params.companyId)
      .maybeSingle(),
  ]);

  return {
    appointment: appointment as AppointmentRow,
    service: (serviceResponse.data ?? null) as ServiceRow | null,
    employee: (employeeResponse.data ?? null) as EmployeeRow | null,
  };
}

function validateFinancialInput(params: {
  formaPagamento: string;
  valor: number;
  percentualComissao: number;
}): string | null {
  if (!params.formaPagamento) {
    return "Informe a forma de pagamento.";
  }

  if (!Number.isFinite(params.valor) || params.valor < 0) {
    return "Informe um valor valido para o pagamento.";
  }

  if (
    !Number.isFinite(params.percentualComissao) ||
    params.percentualComissao < 0 ||
    params.percentualComissao > 100
  ) {
    return "Informe percentual de comissao entre 0 e 100.";
  }

  return null;
}

export async function createPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const appointmentId = sanitizeText(formData.get("appointment_id"));
  const formaPagamento = sanitizeText(formData.get("forma_pagamento"));
  const valorInput = sanitizeMoney(formData.get("valor"));
  const percentualInput = sanitizeMoney(formData.get("percentual_comissao"));

  if (!appointmentId) {
    return { success: false, message: "Selecione um agendamento concluido." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar financeiro.",
    };
  }

  const context = await getAppointmentFinancialContext(
    { appointmentId, companyId },
    supabase,
  );

  if (!context.appointment) {
    return {
      success: false,
      message: "Agendamento invalido para sua empresa.",
    };
  }

  if (context.appointment.status !== "concluido") {
    return {
      success: false,
      message: "Somente agendamentos concluidos podem gerar pagamento.",
    };
  }

  if (!context.service || !context.employee) {
    return {
      success: false,
      message:
        "Nao foi possivel obter dados de servico/funcionario deste agendamento.",
    };
  }

  const valor = Number.isFinite(valorInput)
    ? valorInput
    : Number(context.service.valor);
  const percentualComissao = Number.isFinite(percentualInput)
    ? percentualInput
    : Number(context.employee.percentual_comissao ?? 0);

  const inputError = validateFinancialInput({
    formaPagamento,
    valor,
    percentualComissao,
  });

  if (inputError) {
    return { success: false, message: inputError };
  }

  const valorComissao = roundToTwo((valor * percentualComissao) / 100);

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

  const { error } = await supabase.from("payments").insert({
    company_id: companyId,
    appointment_id: appointmentId,
    valor,
    forma_pagamento: formaPagamento,
    percentual_comissao: percentualComissao,
    valor_comissao: valorComissao,
  });

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel registrar pagamento: ${error.message}`,
    };
  }

  revalidatePath("/painel/financeiro");
  return { success: true, message: "Pagamento registrado com sucesso." };
}

export async function updatePaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const formaPagamento = sanitizeText(formData.get("forma_pagamento"));
  const valor = sanitizeMoney(formData.get("valor"));
  const percentualComissao = sanitizeMoney(formData.get("percentual_comissao"));

  if (!id) {
    return { success: false, message: "Pagamento invalido para atualizacao." };
  }

  const inputError = validateFinancialInput({
    formaPagamento,
    valor,
    percentualComissao,
  });

  if (inputError) {
    return { success: false, message: inputError };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar financeiro.",
    };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, appointment_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!payment) {
    return {
      success: false,
      message: "Pagamento nao encontrado para sua empresa.",
    };
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", payment.appointment_id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!appointment || appointment.status !== "concluido") {
    return {
      success: false,
      message: "Pagamento so pode ser mantido em agendamento concluido.",
    };
  }

  const valorComissao = roundToTwo((valor * percentualComissao) / 100);

  const { error } = await supabase
    .from("payments")
    .update({
      forma_pagamento: formaPagamento,
      valor,
      percentual_comissao: percentualComissao,
      valor_comissao: valorComissao,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel atualizar pagamento: ${error.message}`,
    };
  }

  revalidatePath("/painel/financeiro");
  return { success: true, message: "Pagamento atualizado com sucesso." };
}

export async function deletePaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Pagamento invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar financeiro.",
    };
  }

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel excluir pagamento: ${error.message}`,
    };
  }

  revalidatePath("/painel/financeiro");
  return { success: true, message: "Pagamento excluido com sucesso." };
}
