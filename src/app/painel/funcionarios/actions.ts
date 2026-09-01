"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";

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

function sanitizePercentual(value: FormDataEntryValue | null): number | null {
  const textValue = sanitizeText(value).replace(",", ".");

  if (!textValue) {
    return null;
  }

  const parsedValue = Number(textValue);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

function validatePercentual(value: number | null): boolean {
  return (
    value === null || (Number.isFinite(value) && value >= 0 && value <= 100)
  );
}

async function getCompanyScope() {
  return getAccessContext();
}

export async function createEmployeeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nome = sanitizeText(formData.get("nome"));
  const telefone = sanitizeText(formData.get("telefone"));
  const percentualComissao = sanitizePercentual(
    formData.get("percentual_comissao"),
  );
  const ativo = formData.get("ativo") === "on";

  if (nome.length < 2) {
    return {
      success: false,
      message: "Informe o nome do funcionario com pelo menos 2 caracteres.",
    };
  }

  if (!validatePercentual(percentualComissao)) {
    return {
      success: false,
      message: "Informe um percentual de comissao entre 0 e 100.",
    };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar funcionarios.",
    };
  }

  const { error } = await supabase.from("employees").insert({
    company_id: companyId,
    nome,
    telefone: telefone || null,
    percentual_comissao: percentualComissao,
    ativo,
  });

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel criar funcionario: ${error.message}`,
    };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario criado com sucesso." };
}

export async function updateEmployeeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));
  const nome = sanitizeText(formData.get("nome"));
  const telefone = sanitizeText(formData.get("telefone"));
  const percentualComissao = sanitizePercentual(
    formData.get("percentual_comissao"),
  );
  const ativo = formData.get("ativo") === "on";

  if (!id) {
    return {
      success: false,
      message: "Funcionario invalido para atualizacao.",
    };
  }

  if (nome.length < 2) {
    return {
      success: false,
      message: "Informe o nome do funcionario com pelo menos 2 caracteres.",
    };
  }

  if (!validatePercentual(percentualComissao)) {
    return {
      success: false,
      message: "Informe um percentual de comissao entre 0 e 100.",
    };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar funcionarios.",
    };
  }

  const { error } = await supabase
    .from("employees")
    .update({
      nome,
      telefone: telefone || null,
      percentual_comissao: percentualComissao,
      ativo,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel atualizar funcionario: ${error.message}`,
    };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario atualizado com sucesso." };
}

export async function deleteEmployeeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = sanitizeText(formData.get("id"));

  if (!id) {
    return { success: false, message: "Funcionario invalido para exclusao." };
  }

  const { supabase, companyId, role, errorMessage } = await getCompanyScope();

  if (!companyId) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem gerenciar funcionarios.",
    };
  }

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel excluir funcionario: ${error.message}`,
    };
  }

  revalidatePath("/painel/funcionarios");
  return { success: true, message: "Funcionario excluido com sucesso." };
}

export type MyProfileForEmployeeForm = {
  nome: string;
  telefone: string;
};

// Usado pelo botao "Preencher com meus dados". Employees nao possui campo de e-mail no
// formulario manual, e o perfil do administrador nao guarda telefone pessoal (apenas o
// telefone da empresa).
export async function getMyProfileForEmployeeFormAction(): Promise<MyProfileForEmployeeForm | null> {
  const { supabase, userId, companyId } = await getCompanyScope();

  if (!userId || !companyId) {
    return null;
  }

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nome")
      .eq("id", userId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("telefone")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  if (!profile) {
    return null;
  }

  return {
    nome: profile.nome ?? "",
    telefone: company?.telefone ?? "",
  };
}

// Usado pelo botao "Cadastrar-me como funcionario" na lista de funcionarios, para o
// administrador que nao marcou "atendente unico" no onboarding e ainda nao tem um
// registro de funcionario proprio. Nao ha suporte a avatar no projeto ainda.
export async function registerMyselfAsEmployeeAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { supabase, userId, companyId, role } = await getCompanyScope();

  if (!userId || !companyId) {
    return {
      success: false,
      message: "Nao foi possivel identificar sua empresa.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Apenas administradores podem realizar esta acao.",
    };
  }

  const { data: existingEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingEmployee) {
    return {
      success: false,
      message: "Voce ja possui um registro de funcionario nesta empresa.",
    };
  }

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", userId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("telefone")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  if (!profile) {
    return {
      success: false,
      message: "Nao foi possivel carregar os dados do seu perfil.",
    };
  }

  const { error } = await supabase.from("employees").insert({
    company_id: companyId,
    user_id: userId,
    nome: profile.nome,
    email: profile.email ?? null,
    telefone: company?.telefone ?? null,
    percentual_comissao: null,
    ativo: true,
  });

  if (error) {
    return {
      success: false,
      message: `Nao foi possivel cadastrar voce como funcionario: ${error.message}`,
    };
  }

  revalidatePath("/painel/funcionarios");
  return {
    success: true,
    message: "Voce foi cadastrado como funcionario com sucesso.",
  };
}
