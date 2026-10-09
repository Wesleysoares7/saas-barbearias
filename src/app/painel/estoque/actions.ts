"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import {
  ALLOWED_REASONS,
  STOCK_UNITS,
  type StockMovementReason,
  type StockMovementType,
  type StockUnit,
} from "@/types/stock";

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

function sanitizeMoney(value: FormDataEntryValue | null): number {
  const parsedValue = Number(sanitizeText(value).replace(",", "."));

  if (!Number.isFinite(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
}

function hasAtMostThreeDecimals(value: number): boolean {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6;
}

function isUnit(value: string): value is StockUnit {
  return STOCK_UNITS.includes(value as StockUnit);
}

function isMovementType(value: string): value is StockMovementType {
  return value === "entrada" || value === "saida";
}

function mapStockDatabaseError(message: string): string {
  if (message.includes("Estoque insuficiente")) {
    const available = message.match(/Disponivel:\s*([\d.,-]+)/);

    return available
      ? `Estoque insuficiente para esta saida. Saldo disponivel: ${available[1]}.`
      : "Estoque insuficiente para esta saida.";
  }

  if (message.includes("idx_products_company_nome_unique") || message.includes("duplicate key")) {
    return "Ja existe um produto com este nome.";
  }

  if (message.includes("products") || message.includes("stock_movements")) {
    return "Seu banco ainda nao foi atualizado para o estoque. Execute o script docs/database/014_etapa_almoxarifado_estoque.sql no Supabase SQL Editor e tente novamente.";
  }

  return message;
}

async function writeAuditLog(params: {
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"];
  companyId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from("audit_logs").insert({
    company_id: params.companyId,
    actor_id: params.actorId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error && !error.message.includes("audit_logs")) {
    // Evita quebrar fluxo principal caso o log falhe por motivo secundario.
  }
}

export async function createProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const nome = sanitizeText(formData.get("nome"));
  const categoria = sanitizeText(formData.get("categoria"));
  const sku = sanitizeText(formData.get("sku"));
  const unidade = sanitizeText(formData.get("unidade"));
  const estoqueMinimo = sanitizeText(formData.get("estoque_minimo")) === "" ? 0 : sanitizeMoney(formData.get("estoque_minimo"));
  const ativo = formData.get("ativo") === "on";

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do produto com pelo menos 2 caracteres." };
  }

  if (!isUnit(unidade)) {
    return { success: false, message: "Selecione uma unidade valida." };
  }

  if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0 || !hasAtMostThreeDecimals(estoqueMinimo)) {
    return { success: false, message: "Informe um estoque minimo valido (ate 3 casas decimais)." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar o estoque." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: companyId,
      nome,
      categoria: categoria || null,
      sku: sku || null,
      unidade,
      estoque_minimo: estoqueMinimo,
      ativo,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, message: `Nao foi possivel criar produto: ${mapStockDatabaseError(error.message)}` };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "product_created",
    entity: "products",
    entityId: data?.id ?? "",
    metadata: { nome, unidade, estoque_minimo: estoqueMinimo },
  });

  revalidatePath("/painel/estoque");
  return { success: true, message: "Produto criado com sucesso." };
}

export async function updateProductAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const nome = sanitizeText(formData.get("nome"));
  const categoria = sanitizeText(formData.get("categoria"));
  const sku = sanitizeText(formData.get("sku"));
  const unidade = sanitizeText(formData.get("unidade"));
  const estoqueMinimo = sanitizeText(formData.get("estoque_minimo")) === "" ? 0 : sanitizeMoney(formData.get("estoque_minimo"));
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    return { success: false, message: "Produto invalido para atualizacao." };
  }

  if (nome.length < 2) {
    return { success: false, message: "Informe o nome do produto com pelo menos 2 caracteres." };
  }

  if (!isUnit(unidade)) {
    return { success: false, message: "Selecione uma unidade valida." };
  }

  if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0 || !hasAtMostThreeDecimals(estoqueMinimo)) {
    return { success: false, message: "Informe um estoque minimo valido (ate 3 casas decimais)." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar o estoque." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      nome,
      categoria: categoria || null,
      sku: sku || null,
      unidade,
      estoque_minimo: estoqueMinimo,
      ativo,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, message: `Nao foi possivel atualizar produto: ${mapStockDatabaseError(error.message)}` };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "product_updated",
    entity: "products",
    entityId: id,
    metadata: { nome, unidade, estoque_minimo: estoqueMinimo, ativo },
  });

  revalidatePath("/painel/estoque");
  return { success: true, message: "Produto atualizado com sucesso." };
}

export async function registerStockMovementAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const productId = sanitizeText(formData.get("product_id"));
  const tipo = sanitizeText(formData.get("tipo"));
  const motivo = sanitizeText(formData.get("motivo"));
  const quantidade = sanitizeMoney(formData.get("quantidade"));
  const custoText = sanitizeText(formData.get("custo_unitario"));
  const custoUnitario = custoText === "" ? 0 : sanitizeMoney(formData.get("custo_unitario"));
  const observacao = sanitizeText(formData.get("observacao"));
  const dataMovimento = sanitizeText(formData.get("data_movimento"));

  if (!productId) {
    return { success: false, message: "Produto invalido para movimentacao." };
  }

  if (!isMovementType(tipo)) {
    return { success: false, message: "Tipo de movimentacao invalido." };
  }

  if (!ALLOWED_REASONS[tipo].includes(motivo as StockMovementReason)) {
    return { success: false, message: "Motivo invalido para este tipo de movimentacao." };
  }

  const motivoValido = motivo as StockMovementReason;

  if (!Number.isFinite(quantidade) || quantidade <= 0 || !hasAtMostThreeDecimals(quantidade)) {
    return { success: false, message: "Informe uma quantidade maior que zero (ate 3 casas decimais)." };
  }

  if (tipo === "entrada" && motivoValido === "compra" && (custoText === "" || !Number.isFinite(custoUnitario) || custoUnitario <= 0)) {
    return { success: false, message: "Informe o custo unitario da compra." };
  }

  if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
    return { success: false, message: "Informe um custo unitario valido." };
  }

  if (observacao.length > 500) {
    return { success: false, message: "A observacao pode ter no maximo 500 caracteres." };
  }

  let movementDate: string | null = null;

  if (dataMovimento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataMovimento)) {
      return { success: false, message: "Informe uma data valida." };
    }

    const parsedDate = new Date(`${dataMovimento}T12:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return { success: false, message: "Informe uma data valida." };
    }

    movementDate = parsedDate.toISOString();
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem gerenciar o estoque." };
  }

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      company_id: companyId,
      product_id: productId,
      tipo,
      motivo: motivoValido,
      quantidade,
      custo_unitario: tipo === "entrada" ? custoUnitario : 0,
      observacao: observacao || null,
      created_by: userId,
      ...(movementDate ? { data_movimento: movementDate } : {}),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, message: mapStockDatabaseError(error.message) };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "stock_movement_registered",
    entity: "stock_movements",
    entityId: data?.id ?? "",
    metadata: { product_id: productId, tipo, motivo: motivoValido, quantidade, custo_unitario: custoUnitario },
  });

  revalidatePath("/painel/estoque");
  revalidatePath("/painel/financeiro");
  return { success: true, message: tipo === "entrada" ? "Entrada registrada com sucesso." : "Saida registrada com sucesso." };
}
