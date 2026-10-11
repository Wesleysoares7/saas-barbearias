import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/painel/ui/page-header";
import Link from "next/link";
import { redirect } from "next/navigation";

import { canAccessModule, getAccessContext } from "@/lib/auth/access";

import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";
import { formatDateTimeBR } from "@/lib/datetime";

type NotificationSeverity = "info" | "warning" | "critical";

type SecurityNotificationRow = {
  id: string;
  actor_id: string | null;
  event_key: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

type ProfileRow = {
  id: string;
  nome: string;
  email: string;
};

function getSeverityBadgeClassName(severity: NotificationSeverity): string {
  if (severity === "critical") {
    return "border-rose-500/50 bg-rose-600/10 text-rose-200";
  }

  if (severity === "warning") {
    return "border-amber-500/50 bg-amber-600/10 text-amber-200";
  }

  return "border-brand/50 bg-brand/10 text-brand";
}

function getSeverityLabel(severity: NotificationSeverity): string {
  if (severity === "critical") {
    return "Critico";
  }

  if (severity === "warning") {
    return "Atencao";
  }

  return "Informativo";
}

function formatDateTime(value: string): string {
  const formatted = formatDateTimeBR(value);

  return formatted === "-" ? value : formatted;
}

function sanitizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, companyId, userId, role, redirectTo } = await getAccessContext();

  if (!companyId || !userId || !role) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "notificacoes")) {
    redirect("/painel");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const onlyUnread = sanitizeText(String(resolvedSearchParams.unread ?? "")) === "1";

  let notificationsQuery = supabase
    .from("security_notifications")
    .select("id, actor_id, event_key, title, message, severity, metadata, created_at, read_at")
    .eq("company_id", companyId)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (onlyUnread) {
    notificationsQuery = notificationsQuery.is("read_at", null);
  }

  const notificationsResponse = await notificationsQuery;
  const hasTableIssue = Boolean(notificationsResponse.error?.message.includes("security_notifications"));
  const notifications = (notificationsResponse.data ?? []) as SecurityNotificationRow[];

  const actorIds = [...new Set(notifications.map((item) => item.actor_id).filter(Boolean))] as string[];

  const profilesResponse =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, nome, email").eq("company_id", companyId).in("id", actorIds)
      : { data: [] as ProfileRow[], error: null };

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-5">
        <PageHeader icon={BellRing} title="Notificacoes sensiveis" description="Automacoes para eventos criticos da equipe e convites." actions={<><div className="flex flex-wrap items-center gap-2">
            <Link
              href={onlyUnread ? "/painel/notificacoes" : "/painel/notificacoes?unread=1"}
              className="rounded-lg border border-border px-3 py-2 text-sm text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
            >
              {onlyUnread ? "Mostrar todas" : "Somente nao lidas"}
            </Link>

            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-2 text-sm text-zinc-100 transition hover:border-amber-400 hover:text-amber-300"
              >
                Marcar todas como lidas
              </button>
            </form>
          </div></>} />

        <div className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-zinc-200">
          Total listado: {notifications.length} | Nao lidas: {unreadCount}
        </div>

        {hasTableIssue ? (
          <div className="mt-4 rounded-lg border border-rose-500/35 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
            Este recurso está temporariamente indisponível. Tente novamente em instantes.
          </div>
        ) : null}

        {!hasTableIssue && notifications.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-zinc-300">
            Nenhuma notificacao encontrada para os filtros atuais.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {notifications.map((notification) => {
            const actor = notification.actor_id ? profileById.get(notification.actor_id) : null;
            const metadataText = JSON.stringify(notification.metadata ?? {});

            return (
              <article
                key={notification.id}
                className="rounded-xl border border-border bg-surface-2 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">{notification.title}</h2>
                    <p className="mt-1 text-sm text-zinc-300">{notification.message}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getSeverityBadgeClassName(notification.severity)}`}
                    >
                      {getSeverityLabel(notification.severity)}
                    </span>

                    {notification.read_at ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-600/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                        Lida
                      </span>
                    ) : (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notification_id" value={notification.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:border-amber-400 hover:text-amber-300"
                        >
                          Marcar como lida
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                  <p>Evento: {notification.event_key}</p>
                  <p>Criada em: {formatDateTime(notification.created_at)}</p>
                  <p>Ator: {actor ? `${actor.nome} (${actor.email})` : "Sistema"}</p>
                  <p>Lida em: {notification.read_at ? formatDateTime(notification.read_at) : "Nao lida"}</p>
                </div>

                <details className="mt-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-300">Metadata</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-400">{metadataText}</pre>
                </details>
              </article>
            );
          })}
        </div>
    </div>
  );
}
