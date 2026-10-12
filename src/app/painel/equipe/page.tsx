import { Users } from "lucide-react";
import { PageHeader } from "@/components/painel/ui/page-header";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CreateTeamInviteForm } from "@/components/painel/equipe/create-team-invite-form";
import { TeamInviteItem } from "@/components/painel/equipe/team-invite-item";
import { TeamMemberRoleForm } from "@/components/painel/equipe/team-member-role-form";
import { canAccessModule, getAccessContext, type UserRole } from "@/lib/auth/access";

type TeamMemberRow = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
};

type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

type TeamInviteRow = {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  token: string;
  expires_at: string;
  atende_clientes: boolean | null;
};

export default async function EquipePage() {
  const { supabase, userId, companyId, role, redirectTo } = await getAccessContext();

  if (!companyId || !role || !userId) {
    redirect(redirectTo ?? "/login");
  }

  if (!canAccessModule(role, "equipe")) {
    redirect("/painel");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email, role")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const invitesResponse = await supabase
    .from("team_invites")
    .select("id, email, role, status, token, expires_at, atende_clientes")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: company } = await supabase.from("companies").select("nome").eq("id", companyId).maybeSingle();
  const companyName = (company?.nome as string | undefined) ?? "empresa";

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = (host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "")).replace(/\/+$/, "");

  const { data: employeeRows } = await supabase
    .from("employees")
    .select("user_id, email")
    .eq("company_id", companyId);

  const employeeUserIds = new Set(
    ((employeeRows ?? []) as { user_id: string | null }[]).map((row) => row.user_id).filter((value): value is string => Boolean(value)),
  );

  const members = (profiles ?? []) as TeamMemberRow[];
  const invites = (invitesResponse.data ?? []) as TeamInviteRow[];
  const hasInviteTableIssue = Boolean(invitesResponse.error?.message.includes("team_invites"));

  return (
    <div className="space-y-5">
        <PageHeader icon={Users} title="Equipe, convites e papeis" description="Gerencie papeis e convites de acesso da equipe da sua empresa." />

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Membros da equipe</h2>

          {members.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
              Nenhum membro encontrado para esta empresa.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <TeamMemberRoleForm
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === userId}
                  isEmployee={employeeUserIds.has(member.id)}
                  canManage={role === "admin"}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-100">Convites por e-mail</h2>

          {hasInviteTableIssue ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-600/10 p-4 text-sm text-amber-200">
              Este recurso está temporariamente indisponível. Tente novamente em instantes.
            </p>
          ) : (
            <>
              <CreateTeamInviteForm />

              {invites.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-zinc-300">
                  Nenhum convite enviado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <TeamInviteItem
                      key={invite.id}
                      baseUrl={baseUrl}
                      companyName={companyName}
                      invite={{
                        id: invite.id,
                        email: invite.email,
                        role: invite.role,
                        status: invite.status,
                        token: invite.token,
                        expiresAt: invite.expires_at,
                        atendeClientes: Boolean(invite.atende_clientes),
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}
