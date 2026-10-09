"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPlatformAccessContext } from "@/lib/auth/access";
import { clearSupportCookie, setSupportCookie, SUPPORT_COOKIE } from "@/lib/auth/support";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function createMasterCompanyAction(formData: FormData) {
  const companyName = sanitizeText(formData.get("nome"));
  const phone = sanitizeText(formData.get("telefone"));
  const address = sanitizeText(formData.get("endereco"));

  if (companyName.length < 2) {
    return;
  }

  const { isPlatformAdmin } = await getPlatformAccessContext();

  if (!isPlatformAdmin) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  await adminClient.from("companies").insert({
    nome: companyName,
    telefone: phone || null,
    endereco: address || null,
  });

  revalidatePath("/master/empresas");
}

export async function updateMasterCompanyAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("id"));
  const companyName = sanitizeText(formData.get("nome"));
  const phone = sanitizeText(formData.get("telefone"));
  const address = sanitizeText(formData.get("endereco"));

  if (!companyId || companyName.length < 2) {
    return;
  }

  const { isPlatformAdmin } = await getPlatformAccessContext();

  if (!isPlatformAdmin) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from("companies")
    .update({
      nome: companyName,
      telefone: phone || null,
      endereco: address || null,
    })
    .eq("id", companyId);

  revalidatePath("/master/empresas");
  revalidatePath(`/master/empresas/${companyId}`);
}

export async function deleteMasterCompanyAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("id"));
  const typedName = sanitizeText(formData.get("nome_confirmacao"));

  if (!companyId || !typedName) {
    return;
  }

  const { isPlatformAdmin } = await getPlatformAccessContext();

  if (!isPlatformAdmin) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: company } = await adminClient.from("companies").select("nome").eq("id", companyId).maybeSingle();

  if (!company || company.nome !== typedName) {
    return;
  }

  await adminClient.from("stock_movements").delete().eq("company_id", companyId);
  await adminClient.from("products").delete().eq("company_id", companyId);
  await adminClient.from("security_notifications").delete().eq("company_id", companyId);
  await adminClient.from("audit_logs").delete().eq("company_id", companyId);
  await adminClient.from("team_invites").delete().eq("company_id", companyId);
  await adminClient.from("payments").delete().eq("company_id", companyId);
  await adminClient.from("appointments").delete().eq("company_id", companyId);
  await adminClient.from("customers").delete().eq("company_id", companyId);
  await adminClient.from("employees").delete().eq("company_id", companyId);
  await adminClient.from("services").delete().eq("company_id", companyId);
  await adminClient.from("profiles").delete().eq("company_id", companyId);
  await adminClient.from("companies").delete().eq("id", companyId);

  revalidatePath("/master/empresas");
  revalidatePath("/master/relatorios");
}

export async function startSupportSessionAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("companyId"));
  const { isPlatformAdmin, userId } = await getPlatformAccessContext();

  if (!isPlatformAdmin || !userId || !UUID_PATTERN.test(companyId)) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: company } = await adminClient.from("companies").select("id").eq("id", companyId).maybeSingle();

  if (!company) {
    return;
  }

  await setSupportCookie(companyId);
  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    actor_id: userId,
    action: "support_session_started",
    entity: "companies",
    entity_id: companyId,
    metadata: { support: true },
  });

  redirect("/painel");
}

export async function endSupportSessionAction() {
  const { isPlatformAdmin, userId } = await getPlatformAccessContext();

  if (!isPlatformAdmin || !userId) {
    return;
  }

  const cookieStore = await cookies();
  const companyId = cookieStore.get(SUPPORT_COOKIE)?.value ?? "";

  if (UUID_PATTERN.test(companyId)) {
    await createSupabaseAdminClient().from("audit_logs").insert({
      company_id: companyId,
      actor_id: userId,
      action: "support_session_ended",
      entity: "companies",
      entity_id: companyId,
      metadata: { support: true },
    });
  }

  await clearSupportCookie();
  redirect("/master/empresas");
}
