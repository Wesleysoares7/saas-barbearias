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
  | "clientes"
  | "estoque";
type ModuleAction = "read" | "create" | "update" | "delete" | "export" | "manage";

type AccessContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string | null;
  companyId: string | null;
  role: UserRole | null;
  isPlatformAdmin: boolean;
  errorMessage: string | null;
  redirectTo: "/login" | "/onboarding" | "/painel" | "/master/empresas" | null;
};

type PlatformAccessContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string | null;
  isPlatformAdmin: boolean;
  errorMessage: string | null;
  redirectTo: "/login" | "/painel" | null;
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

export async function getPlatformAccessContext(): Promise<PlatformAccessContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      isPlatformAdmin: false,
      errorMessage: "Sua sessao expirou. Faca login novamente.",
      redirectTo: "/login",
    };
  }

  const { data: isPlatformAdmin, error: platformAdminError } = await supabase.rpc("is_platform_admin");

  if (platformAdminError || !isPlatformAdmin) {
    return {
      supabase,
      userId: user.id,
      isPlatformAdmin: false,
      errorMessage: "Este usuario nao possui acesso master da plataforma.",
      redirectTo: "/painel",
    };
  }

  return {
    supabase,
    userId: user.id,
    isPlatformAdmin: true,
    errorMessage: null,
    redirectTo: null,
  };
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
      isPlatformAdmin: false,
      errorMessage: "Sua sessao expirou. Faca login novamente.",
      redirectTo: "/login",
    };
  }

  const { data: isPlatformAdmin, error: platformAdminError } = await supabase.rpc("is_platform_admin");
  const hasPlatformAdminAccess = !platformAdminError && Boolean(isPlatformAdmin);

  const { data: companyId, error: companyError } = await supabase.rpc("current_company_id");

  if (companyError || !companyId) {
    return {
      supabase,
      userId: user.id,
      companyId: null,
      role: null,
      isPlatformAdmin: hasPlatformAdminAccess,
      errorMessage: hasPlatformAdminAccess ? null : "Empresa nao encontrada para este usuario. Finalize o onboarding.",
      redirectTo: hasPlatformAdminAccess ? "/master/empresas" : "/onboarding",
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
      isPlatformAdmin: hasPlatformAdminAccess,
      errorMessage: hasPlatformAdminAccess ? null : "Perfil de acesso nao encontrado para este usuario.",
      redirectTo: hasPlatformAdminAccess ? "/master/empresas" : "/painel",
    };
  }

  return {
    supabase,
    userId: user.id,
    companyId,
    role: profile.role as UserRole,
    isPlatformAdmin: hasPlatformAdminAccess,
    errorMessage: null,
    redirectTo: null,
  };
}
