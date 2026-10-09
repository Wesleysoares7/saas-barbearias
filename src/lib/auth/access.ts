import { cookies } from "next/headers";

import { SUPPORT_COOKIE } from "@/lib/auth/support";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AppSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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
  supportMode: boolean;
  supportCompanyName: string | null;
  userEmail: string | null;
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
      supportMode: false,
      supportCompanyName: null,
      userEmail: null,
    };
  }

  const { data: isPlatformAdmin, error: platformAdminError } = await supabase.rpc("is_platform_admin");
  const hasPlatformAdminAccess = !platformAdminError && Boolean(isPlatformAdmin);

  if (hasPlatformAdminAccess) {
    const cookieStore = await cookies();
    const supportCompanyId = cookieStore.get(SUPPORT_COOKIE)?.value ?? "";

    if (UUID_PATTERN.test(supportCompanyId)) {
      const adminClient = createSupabaseAdminClient();
      const { data: supportCompany } = await adminClient
        .from("companies")
        .select("id, nome")
        .eq("id", supportCompanyId)
        .maybeSingle();

      if (supportCompany) {
        return {
          supabase: adminClient as unknown as AppSupabaseClient,
          userId: user.id,
          companyId: supportCompany.id as string,
          role: "admin",
          isPlatformAdmin: true,
          errorMessage: null,
          redirectTo: null,
          supportMode: true,
          supportCompanyName: supportCompany.nome as string,
          userEmail: user.email ?? null,
        };
      }
    }
  }

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
      supportMode: false,
      supportCompanyName: null,
      userEmail: user.email ?? null,
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
      supportMode: false,
      supportCompanyName: null,
      userEmail: user.email ?? null,
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
    supportMode: false,
    supportCompanyName: null,
    userEmail: user.email ?? null,
  };
}
