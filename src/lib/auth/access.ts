import { cookies } from "next/headers";

import { SUPPORT_COOKIE } from "@/lib/auth/support";
import {
  BILLING_SELECT,
  type BillingRow,
  type BillingState,
  resolveBillingState,
} from "@/lib/billing/state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AppSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

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
  | "estoque"
  | "minha_comissao"
  | "configuracoes";
type ModuleAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "manage";

export type AccessContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string | null;
  companyId: string | null;
  role: UserRole | null;
  isPlatformAdmin: boolean;
  errorMessage: string | null;
  redirectTo:
    | "/login"
    | "/onboarding"
    | "/painel"
    | "/master/empresas"
    | "/conta-suspensa"
    | null;
  billing: BillingState | null;
  supportMode: boolean;
  supportCompanyName: string | null;
  employeeId: string | null;
  employeeCommissionPercent: number | null;
  userEmail: string | null;
};

type PlatformAccessContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string | null;
  isPlatformAdmin: boolean;
  errorMessage: string | null;
  redirectTo: "/login" | "/painel" | null;
};

export function canAccessModule(
  role: UserRole,
  moduleKey: ModuleKey,
  employeeId: string | null = null,
): boolean {
  if (role === "admin") {
    return moduleKey !== "minha_comissao";
  }

  if (moduleKey === "minha_comissao") {
    return Boolean(employeeId);
  }

  return moduleKey === "agendamentos";
}

export function canPerformAction(
  role: UserRole,
  moduleKey: ModuleKey,
  action: ModuleAction,
): boolean {
  if (role === "admin") {
    return true;
  }

  if (moduleKey === "agendamentos") {
    return action === "read" || action === "create" || action === "update";
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

  const { data: isPlatformAdmin, error: platformAdminError } =
    await supabase.rpc("is_platform_admin");

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
      billing: null,
      supportMode: false,
      supportCompanyName: null,
      employeeId: null,
      employeeCommissionPercent: null,
      userEmail: null,
    };
  }

  const { data: isPlatformAdmin, error: platformAdminError } =
    await supabase.rpc("is_platform_admin");
  const hasPlatformAdminAccess =
    !platformAdminError && Boolean(isPlatformAdmin);

  if (hasPlatformAdminAccess) {
    const cookieStore = await cookies();
    const supportCompanyId = cookieStore.get(SUPPORT_COOKIE)?.value ?? "";

    if (UUID_PATTERN.test(supportCompanyId)) {
      const adminClient = createSupabaseAdminClient();
      const { data: supportCompany } = await adminClient
        .from("companies")
        .select(`id, nome, ${BILLING_SELECT}`)
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
          billing: resolveBillingState(supportCompany as unknown as BillingRow),
          supportMode: true,
          supportCompanyName: supportCompany.nome as string,
          employeeId: null,
          employeeCommissionPercent: null,
          userEmail: user.email ?? null,
        };
      }
    }
  }

  const { data: companyId, error: companyError } =
    await supabase.rpc("current_company_id");

  if (companyError || !companyId) {
    return {
      supabase,
      userId: user.id,
      companyId: null,
      role: null,
      isPlatformAdmin: hasPlatformAdminAccess,
      errorMessage: hasPlatformAdminAccess
        ? null
        : "Empresa nao encontrada para este usuario. Finalize o onboarding.",
      redirectTo: hasPlatformAdminAccess ? "/master/empresas" : "/onboarding",
      billing: null,
      supportMode: false,
      supportCompanyName: null,
      employeeId: null,
      employeeCommissionPercent: null,
      userEmail: user.email ?? null,
    };
  }

  const [{ data: profile, error: profileError }, companyBillingResponse, employeeResponse] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("companies")
        .select(BILLING_SELECT)
        .eq("id", companyId)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("id, percentual_comissao")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle(),
    ]);

  let billing: BillingState | null = null;

  if (companyBillingResponse.error) {
    console.error(
      companyBillingResponse.error.code,
      companyBillingResponse.error.message,
    );
  } else if (companyBillingResponse.data) {
    billing = resolveBillingState(
      companyBillingResponse.data as unknown as BillingRow,
    );
  }

  if (billing?.blocked && !hasPlatformAdminAccess) {
    return {
      supabase,
      userId: user.id,
      companyId: null,
      role: null,
      isPlatformAdmin: false,
      errorMessage: "Sua conta esta suspensa. Entre em contato com o suporte.",
      redirectTo: "/conta-suspensa",
      billing,
      supportMode: false,
      supportCompanyName: null,
      employeeId: null,
      employeeCommissionPercent: null,
      userEmail: user.email ?? null,
    };
  }

  if (profileError || !profile?.role) {
    return {
      supabase,
      userId: user.id,
      companyId,
      role: null,
      isPlatformAdmin: hasPlatformAdminAccess,
      errorMessage: hasPlatformAdminAccess
        ? null
        : "Perfil de acesso nao encontrado para este usuario.",
      redirectTo: hasPlatformAdminAccess ? "/master/empresas" : "/painel",
      billing: null,
      supportMode: false,
      supportCompanyName: null,
      employeeId: null,
      employeeCommissionPercent: null,
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
    billing,
    supportMode: false,
    supportCompanyName: null,
    employeeId: (employeeResponse.data?.id as string | undefined) ?? null,
    employeeCommissionPercent:
      employeeResponse.data?.percentual_comissao === null || employeeResponse.data?.percentual_comissao === undefined
        ? null
        : Number(employeeResponse.data.percentual_comissao),
    userEmail: user.email ?? null,
  };
}

export async function getAccountStatusContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      userEmail: null,
      companyId: null,
      companyName: null,
      role: null,
      billing: null,
      isPlatformAdmin: false,
    };
  }

  const [
    { data: platformAdmin, error: platformAdminError },
    { data: profile },
  ] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const isPlatformAdmin = !platformAdminError && Boolean(platformAdmin);
  const companyId = (profile?.company_id as string | null | undefined) ?? null;
  const role = (profile?.role as UserRole | null | undefined) ?? null;
  let companyName: string | null = null;
  let billing: BillingState | null = null;

  if (companyId) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select(`nome, ${BILLING_SELECT}`)
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error(companyError.code, companyError.message);
    } else if (company) {
      companyName = (company.nome as string | null) ?? null;
      billing = resolveBillingState(company as unknown as BillingRow);
    }
  }

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    companyId,
    companyName,
    role,
    billing,
    isPlatformAdmin,
  };
}
