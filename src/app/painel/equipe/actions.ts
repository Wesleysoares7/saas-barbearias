"use server";

import { friendlyDbError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { getAccessContext, isAdmin, type UserRole } from "@/lib/auth/access";
import { notifySensitiveEvent } from "@/lib/notifications/sensitive-events";

type ActionState = {
  success: boolean;
  message: string;
};

const ALLOWED_ROLES: UserRole[] = ["admin", "employee"];

function sanitizeEmail(value: FormDataEntryValue | null): string {
  return sanitizeText(value).toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function writeAuditLog(params: {
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"];
  companyId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from("audit_logs").insert({
    company_id: params.companyId,
    actor_id: params.actorId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error && !error.message.includes("audit_logs")) {
    // Evita quebrar fluxo principal caso o log falhe por motivo secundario.
  }
}

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isRole(value: string): value is UserRole {
  return ALLOWED_ROLES.includes(value as UserRole);
}

export async function updateMemberRoleAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const memberId = sanitizeText(formData.get("member_id"));
  const roleInput = sanitizeText(formData.get("role"));

  if (!memberId) {
    return { success: false, message: "Membro invalido para atualizacao." };
  }

  if (!isRole(roleInput)) {
    return { success: false, message: "Papel de acesso invalido." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId || !role) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem alterar papeis da equipe." };
  }

  const { data: memberProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", memberId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!memberProfile) {
    return { success: false, message: "Membro nao encontrado na sua empresa." };
  }

  if (memberProfile.role === roleInput) {
    return { success: true, message: "Papel ja estava atualizado." };
  }

  if (memberId === userId && roleInput !== "admin") {
    return { success: false, message: "Voce nao pode remover seu proprio acesso de administrador." };
  }

  if (memberProfile.role === "admin" && roleInput === "employee") {
    const { count: adminsCount, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role", "admin");

    if (countError) {
      return { success: false, message: "Nao foi possivel validar a quantidade de administradores." };
    }

    if ((adminsCount ?? 0) <= 1) {
      return { success: false, message: "Sua empresa precisa manter pelo menos um administrador." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: roleInput })
    .eq("id", memberId)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, message: friendlyDbError(error, "Nao foi possivel atualizar o papel. Tente novamente.") };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "member_role_updated",
    entity: "profiles",
    entityId: memberId,
    metadata: { role: roleInput },
  });

  await notifySensitiveEvent({
    supabase,
    companyId,
    actorId: userId,
    eventKey: "member_role_updated",
    title: "Papel de membro alterado",
    message: `Um papel de acesso foi alterado para ${roleInput}.`,
    severity: "critical",
    metadata: { memberId, role: roleInput },
  });

  revalidatePath("/painel/equipe");
  revalidatePath("/painel");
  return { success: true, message: "Papel atualizado com sucesso." };
}

export async function createTeamInviteAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = sanitizeEmail(formData.get("email"));
  const roleInput = sanitizeText(formData.get("role"));

  if (!isValidEmail(email)) {
    return { success: false, message: "Informe um e-mail valido para convite." };
  }

  if (!isRole(roleInput)) {
    return { success: false, message: "Papel de acesso invalido para convite." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId || !role) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem convidar novos membros." };
  }

  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .eq("email", email)
    .maybeSingle();

  if (existingMember) {
    return { success: false, message: "Esse e-mail ja pertence a um membro da sua empresa." };
  }

  const token = randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingInvite } = await supabase
    .from("team_invites")
    .select("id")
    .eq("company_id", companyId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingInvite) {
    const { error: updateInviteError } = await supabase
      .from("team_invites")
      .update({
        role: roleInput,
        token,
        expires_at: expiresAt,
        invited_by: userId,
      })
      .eq("id", pendingInvite.id)
      .eq("company_id", companyId);

    if (updateInviteError) {
      return {
        success: false,
        message: friendlyDbError(updateInviteError, "Nao foi possivel atualizar convite existente. Tente novamente."),
      };
    }

    await writeAuditLog({
      supabase,
      companyId,
      actorId: userId,
      action: "team_invite_updated",
      entity: "team_invites",
      entityId: pendingInvite.id,
      metadata: { email, role: roleInput },
    });

    await notifySensitiveEvent({
      supabase,
      companyId,
      actorId: userId,
      eventKey: "team_invite_updated",
      title: "Convite de equipe atualizado",
      message: `Um convite pendente para ${email} foi atualizado.`,
      severity: "warning",
      metadata: { email, role: roleInput, inviteId: pendingInvite.id },
    });

    revalidatePath("/painel/equipe");
    return { success: true, message: "Convite pendente atualizado com sucesso." };
  }

  const { error } = await supabase.from("team_invites").insert({
    company_id: companyId,
    email,
    role: roleInput,
    token,
    invited_by: userId,
    status: "pending",
    expires_at: expiresAt,
  });

  if (error) {
    return {
      success: false,
      message: friendlyDbError(error, "Nao foi possivel criar convite. Tente novamente."),
    };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "team_invite_created",
    entity: "team_invites",
    entityId: token,
    metadata: { email, role: roleInput },
  });

  await notifySensitiveEvent({
    supabase,
    companyId,
    actorId: userId,
    eventKey: "team_invite_created",
    title: "Novo convite de equipe criado",
    message: `Um novo convite foi gerado para ${email}.`,
    severity: "warning",
    metadata: { email, role: roleInput, token },
  });

  revalidatePath("/painel/equipe");
  return { success: true, message: "Convite criado com sucesso. Compartilhe o link com o novo membro." };
}

export async function revokeTeamInviteAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inviteId = sanitizeText(formData.get("invite_id"));

  if (!inviteId) {
    return { success: false, message: "Convite invalido para revogacao." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId || !role) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem revogar convites." };
  }

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    return {
      success: false,
      message: friendlyDbError(error, "Nao foi possivel revogar convite. Tente novamente."),
    };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "team_invite_revoked",
    entity: "team_invites",
    entityId: inviteId,
  });

  await notifySensitiveEvent({
    supabase,
    companyId,
    actorId: userId,
    eventKey: "team_invite_revoked",
    title: "Convite de equipe revogado",
    message: "Um convite pendente da equipe foi revogado por um administrador.",
    severity: "warning",
    metadata: { inviteId },
  });

  revalidatePath("/painel/equipe");
  return { success: true, message: "Convite revogado com sucesso." };
}

export async function deleteTeamInviteAction(inviteId: string): Promise<ActionState> {
  const id = sanitizeText(inviteId);

  if (!id) {
    return { success: false, message: "Convite invalido para exclusao." };
  }

  const { supabase, userId, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !userId || !role) {
    return { success: false, message: errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(role)) {
    return { success: false, message: "Apenas administradores podem excluir convites." };
  }

  const { data: deleted, error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return {
      success: false,
      message: friendlyDbError(error, "Nao foi possivel excluir convite. Tente novamente."),
    };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, message: "Convite nao encontrado ou nao esta mais pendente." };
  }

  await writeAuditLog({
    supabase,
    companyId,
    actorId: userId,
    action: "team_invite_deleted",
    entity: "team_invites",
    entityId: id,
  });

  revalidatePath("/painel/equipe");
  return { success: true, message: "Convite excluido com sucesso." };
}