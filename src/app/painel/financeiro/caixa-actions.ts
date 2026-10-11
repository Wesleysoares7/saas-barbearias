"use server";

import { friendlyDbError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { parseMoneyBR } from "@/lib/money";

type ActionState = {
  success: boolean;
  message: string;
};

type Access = Awaited<ReturnType<typeof getAccessContext>>;

type AdminAccess = {
  supabase: Access["supabase"];
  companyId: string;
  userId: string;
};

type DbError = {
  code?: string | null;
  message: string;
};

function sanitizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));

  if (year < 2020 || year > 2100) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireAdmin(): Promise<
  { access: AdminAccess } | { error: ActionState }
> {
  const { supabase, userId, companyId, role, errorMessage } =
    await getAccessContext();

  if (!companyId || !userId) {
    return {
      error: {
        success: false,
        message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
      },
    };
  }

  if (!isAdmin(role)) {
    return {
      error: {
        success: false,
        message: "Apenas administradores podem gerenciar o caixa.",
      },
    };
  }

  return { access: { supabase, companyId, userId } };
}

async function writeAuditLog(
  access: AdminAccess,
  action: string,
  entityId: string,
  metadata: { tipo: string; valor: number; data: string },
) {
  const { error } = await access.supabase.from("audit_logs").insert({
    company_id: access.companyId,
    actor_id: access.userId,
    action,
    entity: "cash_entries",
    entity_id: entityId,
    metadata,
  });

  if (error) {
    console.error("Falha ao registrar auditoria do caixa:", error.code);
  }
}

function mapCashError(
  error: DbError,
  fallback = "Nao foi possivel salvar. Tente novamente.",
): string {
  const code = error.code ?? "";

  if (code === "42P01" || code === "PGRST205" || code === "PGRST202") {
    console.error("db_error", code);
    return "Este recurso esta temporariamente indisponivel. Tente novamente em instantes.";
  }

  return friendlyDbError(error, fallback);
}
function validateEntryFields(formData: FormData):
  | {
      ok: true;
      valor: number;
      data: string;
      categoria: string | null;
      descricao: string;
    }
  | { ok: false; message: string } {
  const valor = parseMoneyBR(sanitizeText(formData.get("valor")));
  const data = sanitizeText(formData.get("data"));
  const categoria = sanitizeText(formData.get("categoria"));
  const descricao = sanitizeText(formData.get("descricao"));

  if (valor === null || valor <= 0) {
    return { ok: false, message: "Informe um valor maior que zero." };
  }

  if (!isValidDate(data)) {
    return { ok: false, message: "Informe uma data valida." };
  }

  if (categoria.length > 60) {
    return {
      ok: false,
      message: "A categoria deve ter no maximo 60 caracteres.",
    };
  }

  if (descricao.length < 2 || descricao.length > 200) {
    return {
      ok: false,
      message: "A descricao deve ter entre 2 e 200 caracteres.",
    };
  }

  return { ok: true, valor, data, categoria: categoria || null, descricao };
}

export async function setOpeningBalanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const valor = parseMoneyBR(sanitizeText(formData.get("valor")));
  const data = sanitizeText(formData.get("data"));

  if (valor === null) {
    return { success: false, message: "Informe um valor valido." };
  }

  if (!isValidDate(data)) {
    return { success: false, message: "Informe uma data valida." };
  }

  const result = await requireAdmin();

  if ("error" in result) {
    return result.error;
  }

  const { access } = result;

  const { data: existing, error: existingError } = await access.supabase
    .from("cash_entries")
    .select("id")
    .eq("company_id", access.companyId)
    .eq("tipo", "saldo_inicial")
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      message: mapCashError(
        existingError,
        "Nao foi possivel carregar o saldo inicial. Tente novamente.",
      ),
    };
  }

  let entryId: string | null = existing?.id ?? null;

  if (existing) {
    // Somente valor e data: o banco nao permite alterar outras colunas
    // (updated_at e preenchido por gatilho).
    const { error } = await access.supabase
      .from("cash_entries")
      .update({ valor, data_lancamento: data })
      .eq("id", existing.id)
      .eq("company_id", access.companyId);

    if (error) {
      return { success: false, message: mapCashError(error) };
    }
  } else {
    const { data: inserted, error } = await access.supabase
      .from("cash_entries")
      .insert({
        company_id: access.companyId,
        created_by: access.userId,
        tipo: "saldo_inicial",
        valor,
        data_lancamento: data,
      })
      .select("id")
      .single();

    if (error) {
      return {
        success: false,
        message:
          error.code === "23505"
            ? "Ja existe um saldo inicial para esta empresa."
            : mapCashError(error),
      };
    }

    entryId = inserted?.id ?? null;
  }

  if (entryId) {
    await writeAuditLog(access, "cash_opening_balance_set", String(entryId), {
      tipo: "saldo_inicial",
      valor,
      data,
    });
  }

  revalidatePath("/painel/financeiro");

  return { success: true, message: "Saldo inicial salvo com sucesso." };
}

export async function createCashEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tipo = sanitizeText(formData.get("tipo"));

  if (tipo !== "entrada" && tipo !== "despesa") {
    return { success: false, message: "Selecione o tipo do lancamento." };
  }

  const fields = validateEntryFields(formData);

  if (!fields.ok) {
    return { success: false, message: fields.message };
  }

  const result = await requireAdmin();

  if ("error" in result) {
    return result.error;
  }

  const { access } = result;

  const { data: inserted, error } = await access.supabase
    .from("cash_entries")
    .insert({
      company_id: access.companyId,
      created_by: access.userId,
      tipo,
      valor: fields.valor,
      data_lancamento: fields.data,
      categoria: fields.categoria,
      descricao: fields.descricao,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return {
      success: false,
      message: error
        ? mapCashError(error, "Nao foi possivel salvar o lancamento.")
        : "Nao foi possivel salvar o lancamento.",
    };
  }

  await writeAuditLog(access, "cash_entry_created", String(inserted.id), {
    tipo,
    valor: fields.valor,
    data: fields.data,
  });

  revalidatePath("/painel/financeiro");

  return { success: true, message: "Lancamento registrado com sucesso." };
}

export async function updateCashEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!isUuid(id)) {
    return { success: false, message: "Lancamento invalido." };
  }

  const fields = validateEntryFields(formData);

  if (!fields.ok) {
    return { success: false, message: fields.message };
  }

  const result = await requireAdmin();

  if ("error" in result) {
    return result.error;
  }

  const { access } = result;

  // Somente as 4 colunas que o banco permite atualizar.
  // NAO enviar updated_at, tipo, company_id nem created_by.
  const { data: updated, error } = await access.supabase
    .from("cash_entries")
    .update({
      valor: fields.valor,
      data_lancamento: fields.data,
      categoria: fields.categoria,
      descricao: fields.descricao,
    })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .in("tipo", ["entrada", "despesa"])
    .select("id, tipo")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: mapCashError(error, "Nao foi possivel atualizar o lancamento."),
    };
  }

  if (!updated) {
    return { success: false, message: "Lancamento nao encontrado." };
  }

  await writeAuditLog(access, "cash_entry_updated", id, {
    tipo: String(updated.tipo),
    valor: fields.valor,
    data: fields.data,
  });

  revalidatePath("/painel/financeiro");

  return { success: true, message: "Lancamento atualizado com sucesso." };
}

export async function deleteCashEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!isUuid(id)) {
    return { success: false, message: "Lancamento invalido." };
  }

  const result = await requireAdmin();

  if ("error" in result) {
    return result.error;
  }

  const { access } = result;

  const { data: deleted, error } = await access.supabase
    .from("cash_entries")
    .delete()
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id, tipo, valor, data_lancamento")
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: mapCashError(error, "Nao foi possivel excluir o lancamento."),
    };
  }

  if (!deleted) {
    return { success: false, message: "Lancamento nao encontrado." };
  }

  await writeAuditLog(access, "cash_entry_deleted", id, {
    tipo: String(deleted.tipo),
    valor: Number(deleted.valor),
    data: String(deleted.data_lancamento),
  });

  revalidatePath("/painel/financeiro");

  return { success: true, message: "Lancamento excluido com sucesso." };
}
