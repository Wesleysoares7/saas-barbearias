"use server";

import { friendlyDbError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    nomeResponsavel?: string;
    nomeEmpresa?: string;
  };
};

function sanitizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function completeOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const nomeResponsavel = sanitizeText(formData.get("nomeResponsavel"));
  const nomeEmpresa = sanitizeText(formData.get("nomeEmpresa"));
  const telefone = sanitizeText(formData.get("telefone"));
  const endereco = sanitizeText(formData.get("endereco"));
  const unicoAtendente = formData.get("unico_atendente") === "on";

  const fieldErrors: OnboardingActionState["fieldErrors"] = {};

  if (nomeResponsavel.length < 3) {
    fieldErrors.nomeResponsavel =
      "Informe seu nome com pelo menos 3 caracteres.";
  }

  if (nomeEmpresa.length < 2) {
    fieldErrors.nomeEmpresa =
      "Informe o nome da empresa com pelo menos 2 caracteres.";
  }

  if (fieldErrors.nomeEmpresa || fieldErrors.nomeResponsavel) {
    return {
      success: false,
      message: "Corrija os campos destacados para continuar.",
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Sua sessao expirou. Faca login novamente.",
    };
  }

  const { data: existingCompanyId } = await supabase.rpc("current_company_id");

  if (existingCompanyId) {
    redirect("/painel");
  }

  const { error: createError } = await supabase.rpc("create_company_with_admin", {
    p_nome_responsavel: nomeResponsavel,
    p_nome_empresa: nomeEmpresa,
    p_telefone: telefone || null,
    p_endereco: endereco || null,
    p_unico_atendente: unicoAtendente,
  });

  if (createError) {
    return {
      success: false,
      message: friendlyDbError(createError, "Nao foi possivel concluir o cadastro. Tente novamente."),
    };
  }
  revalidatePath("/painel");
  redirect("/painel");
}
