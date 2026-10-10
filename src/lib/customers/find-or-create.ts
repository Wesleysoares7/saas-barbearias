import type { getAccessContext } from "@/lib/auth/access";

type SupabaseClientLike = Awaited<ReturnType<typeof getAccessContext>>["supabase"];

type CustomerInput = {
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
};

type FindOrCreateResult =
  | { ok: true; id: string; nome: string; telefone: string | null; created: boolean }
  | { ok: false };

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function findOrCreateCustomer(
  supabase: SupabaseClientLike,
  companyId: string,
  input: CustomerInput,
): Promise<FindOrCreateResult> {
  const nome = input.nome.trim();
  const digits = normalizePhone(input.telefone);

  const base = supabase.from("customers").select("id, nome, telefone").eq("company_id", companyId);
  let existing: { id: unknown; nome: unknown; telefone: unknown } | undefined;

  if (digits.length >= 10 || digits.length === 0) {
    const { data, error } =
      digits.length >= 10
        ? await base.eq("telefone", digits).limit(1)
        : await base.ilike("nome", escapeLike(nome)).limit(1);

    if (error) {
      console.error("Erro ao buscar cliente:", error.code, error.message);
      return { ok: false };
    }

    existing = data?.[0];
  }

  if (existing) {
    return {
      ok: true,
      id: String(existing.id),
      nome: String(existing.nome ?? nome),
      telefone: existing.telefone ? String(existing.telefone) : null,
      created: false,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      nome,
      telefone: digits || null,
      email: input.email.trim() || null,
      observacoes: input.observacoes.trim() || null,
      ativo: true,
    })
    .select("id, nome, telefone")
    .single();

  if (insertError || !inserted) {
    console.error("Erro ao criar cliente:", insertError?.code, insertError?.message);
    return { ok: false };
  }

  return {
    ok: true,
    id: String(inserted.id),
    nome: String(inserted.nome ?? nome),
    telefone: inserted.telefone ? String(inserted.telefone) : null,
    created: true,
  };
}
