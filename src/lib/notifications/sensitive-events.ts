import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotificationSeverity = "info" | "warning" | "critical";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type NotifySensitiveEventParams = {
  supabase: SupabaseServerClient;
  companyId: string;
  actorId: string | null;
  eventKey: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
};

export async function notifySensitiveEvent(params: NotifySensitiveEventParams): Promise<void> {
  const { data: admins, error: adminsError } = await params.supabase
    .from("profiles")
    .select("id")
    .eq("company_id", params.companyId)
    .eq("role", "admin");

  if (adminsError || !admins || admins.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  const notifications = admins.map((admin) => ({
    company_id: params.companyId,
    recipient_id: admin.id,
    actor_id: params.actorId,
    event_key: params.eventKey,
    title: params.title,
    message: params.message,
    severity: params.severity ?? "warning",
    metadata: params.metadata ?? {},
    created_at: now,
  }));

  const { error } = await params.supabase.from("security_notifications").insert(notifications);

  if (error && !error.message.includes("security_notifications")) {
    // Evita quebrar fluxo principal quando a notificacao falha por motivo secundario.
  }
}
