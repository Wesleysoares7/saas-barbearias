import { addDaysToInput, endOfDayIso, startOfDayIso, todayInputValue } from "@/lib/datetime";
import { sanitizeText, normalizeDate } from "./filters";
import { AuthContext } from "./auth";

export type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  nome: string;
  email: string;
};

export type AuditFilters = {
  from: string;
  to: string;
  action?: string;
  entity?: string;
  query?: string;
};

export type DateRange = {
  startIso: string;
  endIso: string;
  labelStart: string;
  labelEnd: string;
};

export type AuditoriaReportData = {
  range: DateRange;
  logs: AuditRow[];
  profileById: Map<string, ProfileRow>;
  filteredLogs: AuditRow[];
  columns: string[];
  rows: (string | number)[][];
};

function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata);
  } catch {
    return "{}";
  }
}

export function validateDateFilters(url: URL): AuditFilters {
  const defaultTo = todayInputValue();
  const defaultFrom = addDaysToInput(defaultTo, -30);

  const fromInput = normalizeDate(sanitizeText(url.searchParams.get("from")), defaultFrom);
  const toInput = normalizeDate(sanitizeText(url.searchParams.get("to")), defaultTo);
  const actionInput = sanitizeText(url.searchParams.get("action"));
  const entityInput = sanitizeText(url.searchParams.get("entity"));
  const queryInput = sanitizeText(url.searchParams.get("q")).toLowerCase();

  return {
    from: fromInput,
    to: toInput,
    action: actionInput || undefined,
    entity: entityInput || undefined,
    query: queryInput || undefined,
  };
}

export async function getAuditoriaReport(context: AuthContext, filters: AuditFilters): Promise<{ error: string } | AuditoriaReportData> {
  const { supabase, companyId } = context;

  const startIso = startOfDayIso(filters.from);
  const endIso = endOfDayIso(filters.to);

  let logsQuery = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, metadata, created_at")
    .eq("company_id", companyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (filters.action) {
    logsQuery = logsQuery.eq("action", filters.action);
  }

  if (filters.entity) {
    logsQuery = logsQuery.eq("entity", filters.entity);
  }

  const logsResponse = await logsQuery;

  if (logsResponse.error) {
    console.error("report_error", logsResponse.error.code);
    return { error: "Nao foi possivel gerar o relatorio." };
  }

  const logs = (logsResponse.data ?? []) as AuditRow[];
  const actorIds = [...new Set(logs.map((item) => item.actor_id).filter(Boolean))] as string[];

  const profilesResponse =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, nome, email").eq("company_id", companyId).in("id", actorIds)
      : { data: [] as ProfileRow[], error: null };

  if (profilesResponse.error) {
    return { error: "Nao foi possivel carregar atores da auditoria." };
  }

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const filteredLogs = filters.query
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

        return searchStack.includes(filters.query!);
      })
    : logs;

  const columns = ["id", "created_at", "action", "entity", "entity_id", "actor_nome", "actor_email", "metadata"];

  const rows = filteredLogs.map((log) => {
    const actor = log.actor_id ? profileById.get(log.actor_id) : null;

    return [log.id, log.created_at, log.action, log.entity, log.entity_id ?? "", actor?.nome ?? "", actor?.email ?? "", formatMetadata(log.metadata)];
  });

  return {
    range: {
      startIso,
      endIso,
      labelStart: filters.from,
      labelEnd: filters.to,
    },
    logs,
    profileById,
    filteredLogs,
    columns,
    rows,
  };
}
