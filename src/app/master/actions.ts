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

const COMPANY_STATUSES = ["trial", "active", "past_due", "suspended", "canceled"] as const;
type CompanyStatusValue = (typeof COMPANY_STATUSES)[number];
const TRIAL_DAYS = 14;
const DAY_MS = 86400000;

function isCompanyStatus(value: string): value is CompanyStatusValue {
  return (COMPANY_STATUSES as readonly string[]).includes(value);
}

async function writeMasterAudit(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  params: { companyId: string; actorId: string; action: string; metadata: Record<string, unknown> },
) {
  const { error } = await adminClient.from("audit_logs").insert({
    company_id: params.companyId,
    actor_id: params.actorId,
    action: params.action,
    entity: "companies",
    entity_id: params.companyId,
    metadata: params.metadata,
  });

  if (error) {
    console.error("master_audit_error", error.code);
  }
}

function revalidateCompany(companyId: string) {
  revalidatePath("/master/empresas");
  revalidatePath(`/master/empresas/${companyId}`);
}

export async function setCompanyStatusAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("companyId"));
  const status = sanitizeText(formData.get("status"));
  const plan = sanitizeText(formData.get("plan")).replace(/\s+/g, " ");

  if (!UUID_PATTERN.test(companyId) || !isCompanyStatus(status) || plan.length > 40) {
    return;
  }

  const { isPlatformAdmin, userId } = await getPlatformAccessContext();

  if (!isPlatformAdmin || !userId) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: company } = await adminClient
    .from("companies")
    .select("status, plan, trial_ends_at")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return;
  }

  const now = new Date();
  const previous = (company.status as string | null) ?? "active";
  const update: Record<string, unknown> = { status, plan: plan || null };

  if (status === "suspended") {
    if (previous !== "suspended") {
      update.suspended_at = now.toISOString();
    }
  } else {
    update.suspended_at = null;
  }

  if (status === "trial") {
    const currentEnd = company.trial_ends_at ? new Date(company.trial_ends_at as string).getTime() : 0;

    if (!(currentEnd > now.getTime())) {
      update.trial_ends_at = new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString();
    }
  }

  const { error } = await adminClient.from("companies").update(update).eq("id", companyId);

  if (error) {
    console.error("master_status_error", error.code);
    return;
  }

  await writeMasterAudit(adminClient, {
    companyId,
    actorId: userId,
    action: "company_status_changed",
    metadata: { de: previous, para: status },
  });
  revalidateCompany(companyId);
}

export async function extendTrialAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("companyId"));
  const days = Number(sanitizeText(formData.get("days")));

  if (!UUID_PATTERN.test(companyId) || ![7, 14, 30].includes(days)) {
    return;
  }

  const { isPlatformAdmin, userId } = await getPlatformAccessContext();

  if (!isPlatformAdmin || !userId) {
    return;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: company } = await adminClient
    .from("companies")
    .select("status, trial_ends_at")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return;
  }

  const previous = (company.status as string | null) ?? "active";

  if (previous !== "trial" && previous !== "suspended") {
    return;
  }

  const nowMs = Date.now();
  const currentEnd = company.trial_ends_at ? new Date(company.trial_ends_at as string).getTime() : 0;
  const base = Math.max(nowMs, Number.isNaN(currentEnd) ? 0 : currentEnd);
  const newEnd = new Date(base + days * DAY_MS).toISOString();

  const { error } = await adminClient
    .from("companies")
    .update({ status: "trial", suspended_at: null, trial_ends_at: newEnd })
    .eq("id", companyId);

  if (error) {
    console.error("master_trial_error", error.code);
    return;
  }

  await writeMasterAudit(adminClient, {
    companyId,
    actorId: userId,
    action: "company_trial_extended",
    metadata: { de: previous, para: "trial", dias: days },
  });
  revalidateCompany(companyId);
}

export async function setBillingExemptAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("companyId"));
  const exemptRaw = sanitizeText(formData.get("exempt"));

  if (!UUID_PATTERN.test(companyId) || (exemptRaw !== "true" && exemptRaw !== "false")) {
    return;
  }

  const { isPlatformAdmin, userId } = await getPlatformAccessContext();

  if (!isPlatformAdmin || !userId) {
    return;
  }

  const exempt = exemptRaw === "true";
  const adminClient = createSupabaseAdminClient();
  const { data: company } = await adminClient
    .from("companies")
    .select("billing_exempt")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return;
  }

  const { error } = await adminClient.from("companies").update({ billing_exempt: exempt }).eq("id", companyId);

  if (error) {
    console.error("master_exempt_error", error.code);
    return;
  }

  await writeMasterAudit(adminClient, {
    companyId,
    actorId: userId,
    action: "company_billing_exempt_changed",
    metadata: { de: Boolean(company.billing_exempt), para: exempt },
  });
  revalidateCompany(companyId);
}