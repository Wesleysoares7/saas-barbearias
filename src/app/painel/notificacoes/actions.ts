"use server";

import { revalidatePath } from "next/cache";

import { canPerformAction, getAccessContext } from "@/lib/auth/access";

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const notificationId = sanitizeText(formData.get("notification_id"));

  if (!notificationId) {
    return;
  }

  const { supabase, userId, companyId, role } = await getAccessContext();

  if (!userId || !companyId || !role) {
    return;
  }

  if (!canPerformAction(role, "notificacoes", "update")) {
    return;
  }

  await supabase
    .from("security_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", companyId)
    .eq("recipient_id", userId)
    .is("read_at", null);

  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { supabase, userId, companyId, role } = await getAccessContext();

  if (!userId || !companyId || !role) {
    return;
  }

  if (!canPerformAction(role, "notificacoes", "update")) {
    return;
  }

  await supabase
    .from("security_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("recipient_id", userId)
    .is("read_at", null);

  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel");
}
