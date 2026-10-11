import { getAccountStatusContext, type AppSupabaseClient } from "@/lib/auth/access";
import { todayInputValue } from "@/lib/datetime";

const PAGE_SIZE = 1000;
const TABLES = [
  "employees",
  "services",
  "customers",
  "appointments",
  "payments",
  "products",
  "stock_movements",
  "cash_entries",
] as const;

async function fetchAll(supabase: AppSupabaseClient, table: string, companyId: string) {
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("export_error", table, error.code);
      throw new Error("export_failed");
    }

    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "empresa";
}

export async function GET() {
  const { supabase, userId, companyId, companyName, role } = await getAccountStatusContext();

  if (!userId) {
    return Response.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (!companyId || role !== "admin") {
    return Response.json({ error: "Apenas administradores podem exportar os dados." }, { status: 403 });
  }

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("nome, telefone, endereco, plan, status")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("export_error", "companies", companyError.code);
      throw new Error("export_failed");
    }

    const results = await Promise.all(TABLES.map((table) => fetchAll(supabase, table, companyId)));
    const payload: Record<string, unknown> = {
      exportado_em: new Date().toISOString(),
      empresa: company,
    };

    TABLES.forEach((table, index) => {
      payload[table] = results[index];
    });

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_id: userId,
      action: "account_data_exported",
      entity: "companies",
      entity_id: companyId,
      metadata: {},
    });

    if (auditError) {
      console.error("audit_error", auditError.code);
    }

    const filename = `dados-${slugify(companyName ?? "empresa")}-${todayInputValue()}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Nao foi possivel exportar os dados." }, { status: 500 });
  }
}