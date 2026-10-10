"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { normalizePhone } from "@/lib/customers/find-or-create";

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

function normalizeNullableText(value: FormDataEntryValue | null): string | null {
  const text = sanitizeText(value);
  return text.length > 0 ? text : null;
}

function isValidEmail(value: string | null): boolean {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapDatabaseError(message: string): string {
  if (message.includes("customers")) {
    return "Seu banco ainda nao foi atualizado para clientes. Execute docs/database/005_etapa13_clientes.sql no Supabase SQL Editor e tente novamente.";
  }

  return message;
}

async function getCompanyScope() {
  return getAccessContext();
}

export async function createCustomerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const nome = sanitizeText(formData.get("nome"));
  const telefoneRaw = normalizeNullableText(formData.get("telefone"));
  const telefone = telefoneRaw ? normalizePhone(telefoneRaw) || null : null;
  const emailRaw = normalizeNullableText(formData.get("email"));
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const observacoes = normalizeNullableText(formData.get("observacoes"));
  const ativo = formData.get("ativo") === "on";

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do cliente com pelo menos 2 caracteres." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Informe um e-mail valido para o cliente." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar clientes." };
  }

  const { error } = await supabase.from("customers").insert({
    company_id: companyId,
    nome,
    telefone,
    email,
    observacoes,
    ativo,
  });

  if (error) {
    return { success: false, message: `Nao foi possivel criar cliente: ${mapDatabaseError(error.message)}` };
  }

  revalidatePath("/painel/clientes");
  return { success: true, message: "Cliente criado com sucesso." };
}

export async function updateCustomerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const nome = sanitizeText(formData.get("nome"));
  const telefoneRaw = normalizeNullableText(formData.get("telefone"));
  const telefone = telefoneRaw ? normalizePhone(telefoneRaw) || null : null;
  const emailRaw = normalizeNullableText(formData.get("email"));
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const observacoes = normalizeNullableText(formData.get("observacoes"));
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    return { success: false, message: "Cliente invalido para atualizacao." };
  }

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do cliente com pelo menos 2 caracteres." };
  }

  if (!isValidEmail(email)) {
    return { success: false, message: "Informe um e-mail valido para o cliente." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar clientes." };
  }

  const { error } = await supabase
    .from("customers")
    .update({
      nome,
      telefone,
      email,
      observacoes,
      ativo,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel atualizar cliente: ${mapDatabaseError(error.message)}` };
  }

  revalidatePath("/painel/clientes");
  return { success: true, message: "Cliente atualizado com sucesso." };
}

export async function deleteCustomerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Cliente invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar clientes." };
  }

  const { error } = await supabase.from("customers").delete().eq("id", id).eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel excluir cliente: ${mapDatabaseError(error.message)}` };
  }

  revalidatePath("/painel/clientes");
  return { success: true, message: "Cliente excluido com sucesso." };
}
