"use server";

import { redirect } from "next/navigation";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { validateDocumento } from "@/lib/documento";

type ActionState = {
  success: boolean;
  message: string;
};

export async function aderirPlanoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const scope = await getAccessContext({ allowLimited: true });

  if (!scope.companyId) {
    return { success: false, message: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { success: false, message: "Apenas administradores podem contratar um plano." };
  }

  const documentoInput = formData.get("documento");

  if (typeof documentoInput !== "string" || !documentoInput.trim()) {
    return { success: false, message: "Informe um CPF ou CNPJ." };
  }

  const validation = validateDocumento(documentoInput);
  if (!validation.ok) {
    return { success: false, message: "CPF ou CNPJ invalido." };
  }

  const documento = validation.digits;

  const { data: company } = await scope.supabase
    .from("companies")
    .select("documento")
    .eq("id", scope.companyId)
    .maybeSingle();

  if (company?.documento) {
    if (company.documento === documento) {
      redirect("/painel/plano/contato");
    }
    return { success: false, message: "O documento já foi informado e só pode ser alterado pelo suporte." };
  }

  const { error: updateError } = await scope.supabase
    .from("companies")
    .update({ documento })
    .eq("id", scope.companyId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { success: false, message: "Nao foi possivel salvar o documento. Tente novamente." };
  }

  redirect("/painel/plano/contato");
}
