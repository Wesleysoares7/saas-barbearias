"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";

type ActionState = {
  success: boolean;
  message: string;
};

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function sanitizePercentual(value: FormDataEntryValue | null): number {
  const textValue = sanitizeText(value).replace(",", ".");
  const parsedValue = Number(textValue);

  if (!Number.isFinite(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
}

async function getCompanyScope() {
  return getAccessContext();
}

export async function createEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const nome = sanitizeText(formData.get("nome"));
  const telefone = sanitizeText(formData.get("telefone"));
  const percentualComissao = sanitizePercentual(formData.get("percentual_comissao"));
  const ativo = formData.get("ativo") === "on";

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do funcionario com pelo menos 2 caracteres." };
  }

  if (percentualComissao && (!Number.isFinite(percentualComissao) || percentualComissao < 0 || percentualComissao > 100)) {
    return { success: false, message: "Informe um percentual de comissao entre 0 e 100." };
  }
  if (!Number.isFinite(percentualComissao) || percentualComissao < 0 || percentualComissao > 100) {
    return { success: false, message: "Informe um percentual de comissao entre 0 e 100." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar funcionarios." };
  }

  const { error } = await supabase.from("employees").insert({
    percentual_comissao: percentualComissao || null,
    company_id: companyId,
    nome,
    telefone: telefone || null,
    percentual_comissao: percentualComissao,
    ativo,
  });

  if (error) {
    return { success: false, message: `Nao foi possivel criar funcionario: ${error.message}` };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario criado com sucesso." };
}

export async function updateEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const nome = sanitizeText(formData.get("nome"));
  const telefone = sanitizeText(formData.get("telefone"));
  const percentualComissao = sanitizePercentual(formData.get("percentual_comissao"));
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    return { success: false, message: "Funcionario invalido para atualizacao." };
  }

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do funcionario com pelo menos 2 caracteres." };
  }

  if (!Number.isFinite(percentualComissao) || percentualComissao < 0 || percentualComissao > 100) {
    return { success: false, message: "Informe um percentual de comissao entre 0 e 100." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar funcionarios." };
  }

  const { error } = await supabase
    .from("employees")
    .update({
      nome,
      telefone: telefone || null,
      percentual_comissao: percentualComissao,
      ativo,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel atualizar funcionario: ${error.message}` };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario atualizado com sucesso." };
}

export async function deleteEmployeeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Funcionario invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar funcionarios." };
  }

  const { error } = await supabase.from("employees").delete().eq("id", id).eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel excluir funcionario: ${error.message}` };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario excluido com sucesso." };
}
