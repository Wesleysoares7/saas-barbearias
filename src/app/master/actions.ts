"use server";

import { revalidatePath } from "next/cache";

import { getPlatformAccessContext } from "@/lib/auth/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
}

export async function deleteMasterCompanyAction(formData: FormData) {
  const companyId = sanitizeText(formData.get("id"));

  if (!companyId) {
    return;
  }

  const { isPlatformAdmin } = await getPlatformAccessContext();

  if (!isPlatformAdmin) {
    return;
  }

  const adminClient = createSupabaseAdminClient();

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
