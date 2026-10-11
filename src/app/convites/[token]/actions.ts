"use server";

import { friendlyDbError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type UserRole } from "@/lib/auth/access";
import { notifySensitiveEvent } from "@/lib/notifications/sensitive-events";

type ActionState = {
  success: boolean;
  message: string;
};

type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  token: string;
  expires_at: string;
};

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function deriveUserName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const metadata = user.user_metadata ?? {};
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.nome,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length >= 2) {
      return candidate.trim();
    }
  }

  const email = (user.email ?? "").trim();
  const beforeAt = email.includes("@") ? email.split("@")[0] : email;

  if (beforeAt.length >= 2) {
    return beforeAt;
  }

  return "Novo membro";
}

export async function acceptTeamInviteAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const token = sanitizeText(formData.get("token"));

  if (!token) {
    return { success: false, message: "Token de convite invalido." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "Sua sessao expirou. Faca login novamente para aceitar o convite." };
  }

  const userEmail = (user.email ?? "").toLowerCase();

  if (!userEmail) {
    return { success: false, message: "Sua conta nao possui e-mail valido para aceitar convite." };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("id, company_id, email, role, status, token, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    return { success: false, message: friendlyDbError(inviteError, "Nao foi possivel validar convite. Tente novamente.") };
  }

  if (!invite) {
    return { success: false, message: "Convite nao encontrado ou indisponivel para sua conta." };
  }

  const inviteRow = invite as InviteRow;

  if (inviteRow.email !== userEmail) {
    return { success: false, message: "Este convite foi enviado para outro e-mail." };
  }

  if (inviteRow.status === "accepted") {
    return { success: true, message: "Convite ja foi aceito anteriormente." };
  }

  if (inviteRow.status === "revoked") {
    return { success: false, message: "Este convite foi revogado pelo administrador." };
  }

  const expiresAt = new Date(inviteRow.expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabase.from("team_invites").update({ status: "expired" }).eq("id", inviteRow.id).eq("status", "pending");
    return { success: false, message: "Este convite expirou. Solicite um novo convite ao administrador." };
  }

  const { data: existingProfile } = await supabase.from("profiles").select("id, company_id").eq("id", user.id).maybeSingle();

  if (existingProfile && existingProfile.company_id !== inviteRow.company_id) {
    return {
      success: false,
      message: "Sua conta ja esta vinculada a outra empresa. Use outro usuario para aceitar este convite.",
    };
  }

  if (!existingProfile) {
    const { error: createProfileError } = await supabase.from("profiles").insert({
      id: user.id,
      company_id: inviteRow.company_id,
      nome: deriveUserName(user),
      email: userEmail,
      role: inviteRow.role,
    });

    if (createProfileError) {
      return {
        success: false,
        message: friendlyDbError(createProfileError, "Nao foi possivel criar seu perfil na empresa. Tente novamente."),
      };
    }
  } else {
    const { error: updateRoleError } = await supabase
      .from("profiles")
      .update({ role: inviteRow.role })
      .eq("id", user.id)
      .eq("company_id", inviteRow.company_id);

    if (updateRoleError) {
      return { success: false, message: friendlyDbError(updateRoleError, "Nao foi possivel atualizar seu papel. Tente novamente.") };
    }
  }

  const { error: acceptError } = await supabase
    .from("team_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", inviteRow.id)
    .eq("status", "pending");

  if (acceptError) {
    return {
      success: false,
      message: friendlyDbError(acceptError, "Nao foi possivel concluir aceite do convite. Tente novamente."),
    };
  }

  await supabase.from("audit_logs").insert({
    company_id: inviteRow.company_id,
    actor_id: user.id,
    action: "team_invite_accepted",
    entity: "team_invites",
    entity_id: inviteRow.id,
    metadata: {
      email: userEmail,
      role: inviteRow.role,
    },
  });

  await notifySensitiveEvent({
    supabase,
    companyId: inviteRow.company_id,
    actorId: user.id,
    eventKey: "team_invite_accepted",
    title: "Convite de equipe aceito",
    message: `${userEmail} aceitou convite e entrou na equipe.`,
    severity: "info",
    metadata: {
      inviteId: inviteRow.id,
      email: userEmail,
      role: inviteRow.role,
    },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/equipe");
  return { success: true, message: "Convite aceito com sucesso. Seu acesso foi liberado no painel." };
}
