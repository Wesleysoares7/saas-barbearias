"use server";

import { friendlyDbError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateDocumento, onlyDigits } from "@/lib/documento";

export type OnboardingActionState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    nomeResponsavel?: string;
    nomeEmpresa?: string;
    documento?: string;
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
  const documentoInput = sanitizeText(formData.get("documento"));
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

  let documento: string | null = null;

  if (documentoInput) {
    const validation = validateDocumento(documentoInput);
    if (!validation.ok) {
      fieldErrors.documento = "CPF ou CNPJ inválido.";
    } else {
      documento = validation.digits;
    }
  }

  if (fieldErrors.nomeEmpresa || fieldErrors.nomeResponsavel || fieldErrors.documento) {
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

  if (documento) {
    const { data: companyId } = await supabase.rpc("current_company_id");

    if (companyId) {
      const { error: updateError } = await supabase
        .from("companies")
        .update({ documento })
        .eq("id", companyId);

      if (updateError) {
        console.error("Erro ao salvar documento:", updateError);
      }
    }
  }

  revalidatePath("/painel");
  redirect("/painel");
}
