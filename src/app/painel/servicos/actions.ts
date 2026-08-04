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

function sanitizeInteger(value: FormDataEntryValue | null): number {
  const parsedValue = Number(sanitizeText(value));

  if (!Number.isFinite(parsedValue)) {
    return Number.NaN;
  }

  return Math.trunc(parsedValue);
}

function sanitizeMoney(value: FormDataEntryValue | null): number {
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

export async function createServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const nome = sanitizeText(formData.get("nome"));
  const duracao = sanitizeInteger(formData.get("duracao"));
  const valor = sanitizeMoney(formData.get("valor"));
  const ativo = formData.get("ativo") === "on";

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do servico com pelo menos 2 caracteres." };
  }

  if (!Number.isFinite(duracao) || duracao <= 0) {
    return { success: false, message: "Informe uma duracao valida em minutos." };
  }

  if (!Number.isFinite(valor) || valor < 0) {
    return { success: false, message: "Informe um valor valido para o servico." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar servicos." };
  }

  const { error } = await supabase.from("services").insert({
    company_id: companyId,
    nome,
    duracao,
    valor,
    ativo,
  });

  if (error) {
    return { success: false, message: `Nao foi possivel criar servico: ${error.message}` };
  }

  revalidatePath("/painel/servicos");
  return { success: true, message: "Servico criado com sucesso." };
}

export async function updateServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const nome = sanitizeText(formData.get("nome"));
  const duracao = sanitizeInteger(formData.get("duracao"));
  const valor = sanitizeMoney(formData.get("valor"));
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    return { success: false, message: "Servico invalido para atualizacao." };
  }

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do servico com pelo menos 2 caracteres." };
  }

  if (!Number.isFinite(duracao) || duracao <= 0) {
    return { success: false, message: "Informe uma duracao valida em minutos." };
  }

  if (!Number.isFinite(valor) || valor < 0) {
    return { success: false, message: "Informe um valor valido para o servico." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar servicos." };
  }

  const { error } = await supabase
    .from("services")
    .update({
      nome,
      duracao,
      valor,
      ativo,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel atualizar servico: ${error.message}` };
  }

  revalidatePath("/painel/servicos");
  return { success: true, message: "Servico atualizado com sucesso." };
}

export async function deleteServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Servico invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar servicos." };
  }

  const { error } = await supabase.from("services").delete().eq("id", id).eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel excluir servico: ${error.message}` };
  }

  revalidatePath("/painel/servicos");
  return { success: true, message: "Servico excluido com sucesso." };
}
