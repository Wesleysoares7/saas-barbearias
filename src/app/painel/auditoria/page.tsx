import { Shield } from "lucide-react";
import { PageHeader } from "@/components/painel/ui/page-header";
import Link from "next/link";
import { redirect } from "next/navigation";

import { canAccessModule, getAccessContext } from "@/lib/auth/access";

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

type SearchParams = {
  from?: string | string[];
  to?: string | string[];
  action?: string | string[];
  entity?: string | string[];
  q?: string | string[];
};

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string, fallback: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function normalizeText(value: string): string {
  return value.trim();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "{}";
  }
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { supabase, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "auditoria")) {
    redirect("/painel");
  }

  const now = new Date();
  const defaultFrom = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
  const defaultTo = toDateInputValue(now);

  const fromInput = normalizeDate(getSingleParam(resolvedSearchParams.from), defaultFrom);
  const toInput = normalizeDate(getSingleParam(resolvedSearchParams.to), defaultTo);
  const actionInput = normalizeText(getSingleParam(resolvedSearchParams.action));
  const entityInput = normalizeText(getSingleParam(resolvedSearchParams.entity));
  const queryInput = normalizeText(getSingleParam(resolvedSearchParams.q));

  const fromIso = new Date(`${fromInput}T00:00:00`).toISOString();
  const toIso = new Date(`${toInput}T23:59:59.999`).toISOString();

  let logsQuery = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, metadata, created_at")
    .eq("company_id", companyId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(500);

  if (actionInput) {
    logsQuery = logsQuery.eq("action", actionInput);
  }

  if (entityInput) {
    logsQuery = logsQuery.eq("entity", entityInput);
  }

  const logsResponse = await logsQuery;

  const hasAuditTableIssue = Boolean(logsResponse.error?.message.includes("audit_logs"));
  const logs = (logsResponse.data ?? []) as AuditRow[];
  const actorIds = [...new Set(logs.map((item) => item.actor_id).filter(Boolean))] as string[];

  const profilesResponse =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, nome, email").eq("company_id", companyId).in("id", actorIds)
      : { data: [] as ProfileRow[], error: null };

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const textQuery = queryInput.toLowerCase();
  const filteredLogs = textQuery
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

        return searchStack.includes(textQuery);
      })
    : logs;

  const uniqueActions = [...new Set(logs.map((item) => item.action))].sort((left, right) => left.localeCompare(right));
  const uniqueEntities = [...new Set(logs.map((item) => item.entity))].sort((left, right) => left.localeCompare(right));
  const exportQuery = new URLSearchParams({
    from: fromInput,
    to: toInput,
    action: actionInput,
    entity: entityInput,
    q: queryInput,
  });

  const exportAuditCsvHref = `/api/reports/auditoria?${exportQuery.toString()}`;
  const exportAuditPdfHref = `/api/reports/auditoria/pdf?${exportQuery.toString()}`;

  return (
    <div className="space-y-5">
        <PageHeader icon={Shield} title="Auditoria" description="Acompanhe alteracoes sensiveis da sua empresa." />

        <form className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-5">
          <div className="space-y-1">
            <label htmlFor="auditoria-from" className="text-xs text-zinc-400">
              De
            </label>
            <input
              id="auditoria-from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="auditoria-to" className="text-xs text-zinc-400">
              Ate
            </label>
            <input
              id="auditoria-to"
              name="to"
              type="date"
              defaultValue={toInput}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="auditoria-action" className="text-xs text-zinc-400">
              Acao
            </label>
            <select
              id="auditoria-action"
              name="action"
              defaultValue={actionInput}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
            >
              <option value="">Todas</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="auditoria-entity" className="text-xs text-zinc-400">
              Entidade
            </label>
            <select
              id="auditoria-entity"
              name="entity"
              defaultValue={entityInput}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
            >
              <option value="">Todas</option>
              {uniqueEntities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="auditoria-q" className="text-xs text-zinc-400">
              Busca
            </label>
            <input
              id="auditoria-q"
              name="q"
              type="text"
              defaultValue={queryInput}
              placeholder="ator, acao, entidade..."
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-zinc-100 outline-none focus:border-brand"
            />
          </div>

          <div className="md:col-span-5 flex items-center gap-2">
            <button
              type="submit"
              className="h-10 rounded-lg border border-brand/40 bg-brand/10 px-4 text-sm font-medium text-brand transition hover:border-brand"
            >
              Aplicar filtros
            </button>

            <Link
              href="/painel/auditoria"
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-zinc-100 inline-flex items-center"
            >
              Limpar
            </Link>

            <p className="text-xs text-zinc-500">{filteredLogs.length} registro(s) encontrado(s)</p>
          </div>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <Link
              href={exportAuditCsvHref}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-zinc-200 transition hover:border-brand hover:text-brand inline-flex items-center"
            >
              Exportar auditoria (CSV)
            </Link>

            <Link
              href={exportAuditPdfHref}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-zinc-200 transition hover:border-brand hover:text-brand inline-flex items-center"
            >
              Exportar auditoria (PDF)
            </Link>
          </div>
        </form>

        {hasAuditTableIssue ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Para habilitar auditoria, execute o script docs/database/003_etapa11_convites_auditoria.sql no Supabase SQL Editor.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
            Nenhum evento de auditoria encontrado para os filtros informados.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const actor = log.actor_id ? profileById.get(log.actor_id) : null;

              return (
                <article key={log.id} className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="text-xs text-zinc-400">Quando: {formatDate(log.created_at)}</p>
                    <p className="text-xs text-zinc-400 sm:text-right">Acao: {log.action}</p>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-zinc-200">Entidade: {log.entity}</p>
                    <p className="text-sm text-zinc-200 sm:text-right">Registro: {log.entity_id ?? "-"}</p>
                  </div>

                  <p className="mt-2 text-xs text-zinc-400">
                    Ator: {actor ? `${actor.nome} (${actor.email})` : log.actor_id ?? "Sistema"}
                  </p>

                  <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface p-3 text-xs text-zinc-300">
                    {formatMetadata(log.metadata)}
                  </pre>
                </article>
              );
            })}
          </div>
        )}
    </div>
  );
}
