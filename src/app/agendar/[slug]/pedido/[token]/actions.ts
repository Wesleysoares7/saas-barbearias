"use server";

import { revalidatePath } from "next/cache";

import { UUID_PATTERN } from "@/lib/agendamento-publico/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CancelState = {
  success: boolean;
  message: string;
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function cancelPublicBookingAction(
  _prevState: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const slug = readText(formData, "slug");
  const token = readText(formData, "token");

  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !UUID_PATTERN.test(token)) {
    return { success: false, message: "Pedido inválido." };
  }

  const admin = createSupabaseAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!company) {
    return { success: false, message: "Pedido inválido." };
  }

  const { data: updated, error } = await admin
    .from("appointments")
    .update({
      status: "cancelado",
      cancelado_pelo_cliente_em: new Date().toISOString(),
    })
    .eq("public_token", token)
    .eq("company_id", (company as { id: string }).id)
    .in("status", ["aguardando", "agendado"])
    .gt("data_hora", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("agendar: erro ao cancelar", error.code, error.message);

    return {
      success: false,
      message: "Não foi possível cancelar. Tente novamente.",
    };
  }

  if (!updated) {
    return {
      success: false,
      message:
        "Este pedido não pode mais ser cancelado. Fale diretamente com a barbearia.",
    };
  }

  revalidatePath(`/agendar/${slug}/pedido/${token}`);

  return { success: true, message: "Pedido cancelado." };
}