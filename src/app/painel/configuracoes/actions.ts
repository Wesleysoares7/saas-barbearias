"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { isThemeId } from "@/lib/themes";
import { validateDocumento } from "@/lib/documento";

type ActionState = {
  success: boolean;
  message: string;
};

const BUCKET = "company-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// O tipo enviado pelo navegador pode ser forjado: confere tambem os primeiros bytes.
function matchesSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47].every((value, index) => bytes[index] === value);
  }

  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

type AdminScope =
  | { error: string }
  | { error?: undefined; supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"]; companyId: string };

async function getAdminScope(): Promise<AdminScope> {
  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { error: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { error: "Apenas administradores podem alterar a logo da empresa." };
  }

  return { supabase: scope.supabase, companyId: scope.companyId };
}

export async function uploadLogoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecione uma imagem para a logo." };
  }

  const extension = EXTENSION_BY_TYPE[file.type];

  if (!extension) {
    return { success: false, message: "Formato invalido. Envie uma imagem PNG, JPEG ou WEBP." };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { success: false, message: "A imagem deve ter no maximo 2 MB." };
  }

  const scope = await getAdminScope();

  if (scope.error !== undefined) {
    return { success: false, message: scope.error };
  }

  const { supabase, companyId } = scope;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!matchesSignature(file.type, bytes)) {
    return { success: false, message: "O arquivo nao parece ser uma imagem valida." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("logo")
    .eq("id", companyId)
    .maybeSingle();

  const previousPath = typeof company?.logo === "string" ? company.logo : null;
  const path = `${companyId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, message: "Nao foi possivel enviar a logo. Tente novamente." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("companies")
    .update({ logo: path })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { success: false, message: "Nao foi possivel salvar a logo. Tente novamente." };
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  revalidatePath("/painel");
  return { success: true, message: "Logo atualizada com sucesso." };
}

export async function removeLogoAction(): Promise<ActionState> {
  const scope = await getAdminScope();

  if (scope.error !== undefined) {
    return { success: false, message: scope.error };
  }

  const { supabase, companyId } = scope;

  const { data: company } = await supabase
    .from("companies")
    .select("logo")
    .eq("id", companyId)
    .maybeSingle();

  const previousPath = typeof company?.logo === "string" ? company.logo : null;

  if (!previousPath) {
    return { success: false, message: "Sua empresa ainda nao tem logo." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("companies")
    .update({ logo: null })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { success: false, message: "Nao foi possivel remover a logo. Tente novamente." };
  }

  await supabase.storage.from(BUCKET).remove([previousPath]);

  revalidatePath("/painel");
  return { success: true, message: "Logo removida." };
}

export async function setThemeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const tema = formData.get("tema");

  if (!isThemeId(tema)) {
    return { success: false, message: "Escolha um dos temas disponiveis." };
  }

  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { success: false, message: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { success: false, message: "Apenas administradores podem alterar o tema da empresa." };
  }

  const { data: updated, error } = await scope.supabase
    .from("companies")
    .update({ tema })
    .eq("id", scope.companyId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { success: false, message: "Nao foi possivel salvar o tema. Tente novamente." };
  }

  revalidatePath("/painel", "layout");

  return { success: true, message: "Tema atualizado com sucesso." };
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

export async function setCompanyInfoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { success: false, message: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { success: false, message: "Apenas administradores podem alterar os dados da empresa." };
  }

  const nome = readText(formData, "nome");
  const telefone = readText(formData, "telefone");
  const endereco = readText(formData, "endereco");
  const cidade = readText(formData, "cidade");
  const uf = readText(formData, "uf").toUpperCase();
  const email_contato = readText(formData, "email_contato");
  const documentoInput = readText(formData, "documento");

  if (nome.length < 2 || nome.length > 120) {
    return { success: false, message: "O nome deve ter entre 2 e 120 caracteres." };
  }

  if (telefone && telefone.length > 30) {
    return { success: false, message: "O telefone deve ter no máximo 30 caracteres." };
  }

  if (endereco && endereco.length > 200) {
    return { success: false, message: "O endereço deve ter no máximo 200 caracteres." };
  }

  if (cidade && cidade.length > 60) {
    return { success: false, message: "A cidade deve ter no máximo 60 caracteres." };
  }

  if (uf && !/^[A-Z]{2}$/.test(uf)) {
    return { success: false, message: "A UF deve ter exatamente 2 letras maiúsculas." };
  }

  if (email_contato && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email_contato)) {
    return { success: false, message: "O e-mail de contato deve ser válido." };
  }

  let documento: string | null = null;

  if (documentoInput) {
    const validation = validateDocumento(documentoInput);
    if (!validation.ok) {
      return { success: false, message: "CPF ou CNPJ inválido." };
    }
    documento = validation.digits;
  }

  const updateData: Record<string, string | null> = {
    nome,
    telefone: telefone || null,
    endereco: endereco || null,
    cidade: cidade || null,
    uf: uf || null,
    email_contato: email_contato || null,
    documento,
  };

  const { data: updated, error } = await scope.supabase
    .from("companies")
    .update(updateData)
    .eq("id", scope.companyId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { success: false, message: "Nao foi possivel salvar os dados. Tente novamente." };
  }

  revalidatePath("/painel", "layout");

  return { success: true, message: "Dados da empresa atualizados com sucesso." };
}

export async function setCardFeesAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { success: false, message: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { success: false, message: "Apenas administradores podem alterar as taxas do cartão." };
  }

  const taxaDebitoInput = readText(formData, "taxa_cartao_debito");
  const taxaCreditoInput = readText(formData, "taxa_cartao_credito");

  if (!taxaDebitoInput) {
    return { success: false, message: "Informe a taxa do cartão de débito." };
  }

  if (!taxaCreditoInput) {
    return { success: false, message: "Informe a taxa do cartão de crédito." };
  }

  const taxaDebito = parseFloat(taxaDebitoInput.replace(",", "."));
  const taxaCredito = parseFloat(taxaCreditoInput.replace(",", "."));

  if (isNaN(taxaDebito)) {
    return { success: false, message: "A taxa do débito deve ser um número válido." };
  }

  if (isNaN(taxaCredito)) {
    return { success: false, message: "A taxa do crédito deve ser um número válido." };
  }

  if (taxaDebito < 0 || taxaDebito > 100) {
    return { success: false, message: "A taxa do débito deve estar entre 0 e 100." };
  }

  if (taxaCredito < 0 || taxaCredito > 100) {
    return { success: false, message: "A taxa do crédito deve estar entre 0 e 100." };
  }

  const { data: updated, error } = await scope.supabase
    .from("companies")
    .update({ taxa_cartao_debito: taxaDebito, taxa_cartao_credito: taxaCredito })
    .eq("id", scope.companyId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { success: false, message: "Nao foi possivel salvar as taxas. Tente novamente." };
  }

  revalidatePath("/painel", "layout");

  return { success: true, message: "Taxas do cartão atualizadas com sucesso." };
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BOOKING_INTERVALS = [15, 30, 45, 60];
const BOOKING_LEADS = [0, 30, 60, 120, 240];
const BOOKING_MAX_DAYS = [7, 15, 30, 60];

export async function setBookingConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { success: false, message: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { success: false, message: "Apenas administradores podem alterar o agendamento online." };
  }

  const slug = readText(formData, "slug").toLowerCase();
  const enabled = formData.get("agendamento_online") === "on";
  const intervalMin = Number(readText(formData, "agendamento_intervalo_min"));
  const leadMin = Number(readText(formData, "agendamento_antecedencia_min"));
  const maxDays = Number(readText(formData, "agendamento_dias_max"));

  if (slug && (slug.length < 3 || slug.length > 40 || !SLUG_PATTERN.test(slug))) {
    return {
      success: false,
      message: "O endereco deve ter de 3 a 40 caracteres, apenas letras minusculas, numeros e hifens (sem hifen no inicio ou no fim).",
    };
  }

  if (enabled && !slug) {
    return { success: false, message: "Informe o endereco do link para receber agendamentos online." };
  }

  if (
    !BOOKING_INTERVALS.includes(intervalMin) ||
    !BOOKING_LEADS.includes(leadMin) ||
    !BOOKING_MAX_DAYS.includes(maxDays)
  ) {
    return { success: false, message: "Escolha valores validos nas opcoes de agendamento." };
  }

  const { data: updated, error } = await scope.supabase
    .from("companies")
    .update({
      slug: slug || null,
      agendamento_online: enabled,
      agendamento_intervalo_min: intervalMin,
      agendamento_antecedencia_min: leadMin,
      agendamento_dias_max: maxDays,
    })
    .eq("id", scope.companyId)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    return { success: false, message: "Esse endereco ja esta em uso. Escolha outro." };
  }

  if (error || !updated) {
    return { success: false, message: "Nao foi possivel salvar. Tente novamente." };
  }

  revalidatePath("/painel/configuracoes");

  return { success: true, message: "Agendamento online atualizado." };
}
