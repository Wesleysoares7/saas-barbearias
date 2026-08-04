"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

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

  const fieldErrors: OnboardingActionState["fieldErrors"] = {};

  if (nomeResponsavel.length < 3) {
    fieldErrors.nomeResponsavel = "Informe seu nome com pelo menos 3 caracteres.";
  }

  if (nomeEmpresa.length < 2) {
    fieldErrors.nomeEmpresa = "Informe o nome da empresa com pelo menos 2 caracteres.";
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

  const companyId = randomUUID();

  const { error: companyError } = await supabase.from("companies").insert({
    id: companyId,
    nome: nomeEmpresa,
    telefone: telefone || null,
    endereco: endereco || null,
  });

  if (companyError) {
    return {
      success: false,
      message: `Nao foi possivel criar a empresa: ${companyError?.message ?? "erro desconhecido"}`,
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    company_id: companyId,
    nome: nomeResponsavel,
    email: (user.email ?? "").toLowerCase(),
    role: "admin",
  });

  if (profileError) {
    return {
      success: false,
      message: `Empresa criada, mas houve erro ao criar o perfil admin: ${profileError.message}`,
    };
  }

  revalidatePath("/painel");
  redirect("/painel");
}
