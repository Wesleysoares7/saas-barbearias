import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "employee";

type ModuleKey =
  | "funcionarios"
  | "servicos"
  | "agendamentos"
  | "financeiro"
  | "relatorios"
  | "equipe"
  | "auditoria"
  | "notificacoes"
  | "clientes";
type ModuleAction = "read" | "create" | "update" | "delete" | "export" | "manage";

type AccessContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string | null;
  companyId: string | null;
  role: UserRole | null;
  errorMessage: string | null;
  redirectTo: "/login" | "/onboarding" | "/painel" | null;
};

export function canAccessModule(role: UserRole, moduleKey: ModuleKey): boolean {
  if (role === "admin") {
    return true;
  }

  return moduleKey === "agendamentos" || moduleKey === "relatorios";
}

export function canPerformAction(role: UserRole, moduleKey: ModuleKey, action: ModuleAction): boolean {
  if (role === "admin") {
    return true;
  }

  if (moduleKey === "agendamentos") {
    return action === "read" || action === "create" || action === "update";
  }

  if (moduleKey === "relatorios") {
    return action === "read" || action === "export";
  }

  return false;
}

export function isAdmin(role: UserRole | null): boolean {
  return role === "admin";
}

export async function getAccessContext(): Promise<AccessContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      companyId: null,
      role: null,
      errorMessage: "Sua sessao expirou. Faca login novamente.",
      redirectTo: "/login",
    };
  }

  const { data: companyId, error: companyError } = await supabase.rpc("current_company_id");

  if (companyError || !companyId) {
    return {
      supabase,
      userId: user.id,
      companyId: null,
      role: null,
      errorMessage: "Empresa nao encontrada para este usuario. Finalize o onboarding.",
      redirectTo: "/onboarding",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return {
      supabase,
      userId: user.id,
      companyId,
      role: null,
      errorMessage: "Perfil de acesso nao encontrado para este usuario.",
      redirectTo: "/painel",
    };
  }

  return {
    supabase,
    userId: user.id,
    companyId,
    role: profile.role as UserRole,
    errorMessage: null,
    redirectTo: null,
  };
}
