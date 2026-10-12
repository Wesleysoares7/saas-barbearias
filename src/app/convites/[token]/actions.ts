"use server";

import { friendlyDbError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifySensitiveEvent } from "@/lib/notifications/sensitive-events";

type ActionState = {
  success: boolean;
  message: string;
};

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

  const { data: companyId, error: acceptError } = await supabase.rpc("accept_team_invite", { p_token: token });

  if (acceptError) {
    if (acceptError.code === "P0001") {
      if (acceptError.message.includes("expirou")) {
        await supabase.from("team_invites").update({ status: "expired" }).eq("token", token).eq("status", "pending");
      }

      return { success: false, message: acceptError.message };
    }

    return {
      success: false,
      message: friendlyDbError(acceptError, "Nao foi possivel concluir aceite do convite. Tente novamente."),
    };
  }

  const userEmail = (user.email ?? "").toLowerCase();

  if (typeof companyId === "string") {
    await notifySensitiveEvent({
      supabase,
      companyId,
      actorId: user.id,
      eventKey: "team_invite_accepted",
      title: "Convite de equipe aceito",
      message: `${userEmail} aceitou convite e entrou na equipe.`,
      severity: "info",
      metadata: { email: userEmail },
    });
  }

  revalidatePath("/painel/funcionarios");  revalidatePath("/painel");
  revalidatePath("/painel/equipe");
  return { success: true, message: "Convite aceito com sucesso. Seu acesso foi liberado no painel." };
}
