import { getAccessContext, isAdmin } from "@/lib/auth/access";

type AccessContext = Awaited<ReturnType<typeof getAccessContext>>;

export type AuthContext = {
  supabase: AccessContext["supabase"];
  userId: string;
  companyId: string;
  role: string;
};

export async function validateReportAccess(): Promise<
  { error: string; status: number } | { context: AuthContext }
> {
  const { supabase, userId, companyId, role } = await getAccessContext();

  if (!userId) {
    return { error: "Nao autenticado.", status: 401 };
  }

  if (!companyId) {
    return { error: "Empresa nao encontrada para este usuario.", status: 400 };
  }

  if (!role || !isAdmin(role)) {
    return { error: "Apenas administradores podem exportar relatorios.", status: 403 };
  }

  return {
    context: {
      supabase,
      userId,
      companyId,
      role,
    },
  };
}


