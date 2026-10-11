import { Users } from "lucide-react";
import { PageHeader } from "@/components/painel/ui/page-header";
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
    .select("id, email, role, status, token, expires_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

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
                <TeamMemberRoleForm key={member.id} member={member} isCurrentUser={member.id === userId} />
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
                      invite={{
                        id: invite.id,
                        email: invite.email,
                        role: invite.role,
                        status: invite.status,
                        token: invite.token,
                        expiresAt: invite.expires_at,
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
