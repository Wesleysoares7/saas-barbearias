import { canPerformAction, getAccessContext } from "@/lib/auth/access";
import { addDaysToInput, endOfDayIso, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { generateReportPdf } from "@/lib/reports/pdf";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ProfileRow = {
  id: string;
  nome: string;
  email: string;
};

function sanitizeText(value: string | null): string {
  return (value ?? "").trim();
}

function normalizeDate(value: string, fallback: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata);
  } catch {
    return "{}";
  }
}

export async function GET(request: Request) {
  const { supabase, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !role) {
    return Response.json({ error: errorMessage ?? "Nao autenticado." }, { status: 401 });
  }

  if (!canPerformAction(role, "auditoria", "export")) {
    return Response.json({ error: "Sem permissao para exportar auditoria." }, { status: 403 });
  }

  const url = new URL(request.url);
  const defaultTo = todayInputValue();
  const defaultFrom = addDaysToInput(defaultTo, -30);

  const fromInput = normalizeDate(sanitizeText(url.searchParams.get("from")), defaultFrom);
  const toInput = normalizeDate(sanitizeText(url.searchParams.get("to")), defaultTo);
  const actionInput = sanitizeText(url.searchParams.get("action"));
  const entityInput = sanitizeText(url.searchParams.get("entity"));
  const queryInput = sanitizeText(url.searchParams.get("q")).toLowerCase();

  const fromIso = startOfDayIso(fromInput);
  const toIso = endOfDayIso(toInput);

  let logsQuery = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, metadata, created_at")
    .eq("company_id", companyId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (actionInput) {
    logsQuery = logsQuery.eq("action", actionInput);
  }

  if (entityInput) {
    logsQuery = logsQuery.eq("entity", entityInput);
  }

  const logsResponse = await logsQuery;

  if (logsResponse.error) {
    return Response.json({ error: `Nao foi possivel exportar auditoria: ${logsResponse.error.message}` }, { status: 500 });
  }

  const logs = (logsResponse.data ?? []) as AuditRow[];
  const actorIds = [...new Set(logs.map((item) => item.actor_id).filter(Boolean))] as string[];

  const profilesResponse =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, nome, email").eq("company_id", companyId).in("id", actorIds)
      : { data: [] as ProfileRow[], error: null };

  if (profilesResponse.error) {
    return Response.json({ error: "Nao foi possivel carregar atores da auditoria." }, { status: 500 });
  }

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const filteredLogs = queryInput
    ? logs.filter((log) => {
        const actor = log.actor_id ? profileById.get(log.actor_id) : null;
        const searchStack = [
          log.action,
          log.entity,
          log.entity_id ?? "",
          formatMetadata(log.metadata),
          actor?.nome ?? "",
          actor?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchStack.includes(queryInput);
      })
    : logs;

  const rows = filteredLogs.map((log) => {
    const actor = log.actor_id ? profileById.get(log.actor_id) : null;

    return [
      log.id,
      log.created_at,
      log.action,
      log.entity,
      log.entity_id,
      actor?.nome ?? "",
      actor?.email ?? "",
      formatMetadata(log.metadata),
    ];
  });

  const pdfBytes = await generateReportPdf({
    title: "Relatorio de auditoria",
    periodLabel: `${fromInput} a ${toInput}`,
    columns: ["id", "created_at", "action", "entity", "entity_id", "actor_nome", "actor_email", "metadata"],
    rows,
  });
  const pdfArray = new Uint8Array(pdfBytes);
  const pdfBody = pdfArray.buffer.slice(pdfArray.byteOffset, pdfArray.byteOffset + pdfArray.byteLength);

  const fileName = `auditoria_${fromInput}_${toInput}.pdf`;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
